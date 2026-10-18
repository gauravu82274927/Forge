import { NextResponse } from 'next/server';
import { FALLBACK_ANSWER, SYSTEM_PROMPT, answerFromFaq } from '@/lib/assistant-knowledge';

export const runtime = 'nodejs';

const MAX_MESSAGES = 10;
const MAX_CHARS = 1000;
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-haiku-5-5';

// Best-effort per-IP limit. On serverless hosts each instance has its own
// memory, so this only slows down casual abuse; it is not a hard guarantee.
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 12;
const hits = new Map<string, number[]>();

function limited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > MAX_PER_WINDOW;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

function parseMessages(body: unknown): ChatMessage[] | null {
  const raw = (body as { messages?: unknown })?.messages;
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const out: ChatMessage[] = [];
  for (const m of raw.slice(-MAX_MESSAGES)) {
    const role = (m as ChatMessage)?.role;
    const content = (m as ChatMessage)?.content;
    if ((role !== 'user' && role !== 'assistant') || typeof content !== 'string') return null;
    out.push({ role, content: content.slice(0, MAX_CHARS) });
  }
  // The API needs the conversation to start with, and end on, a user turn.
  while (out.length && out[0].role !== 'user') out.shift();
  if (!out.length || out[out.length - 1].role !== 'user') return null;
  return out;
}

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (limited(ip)) {
    return NextResponse.json(
      { reply: 'You are sending messages very quickly. Please wait a moment and try again.' },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }
  const messages = parseMessages(body);
  if (!messages) return NextResponse.json({ error: 'Invalid messages.' }, { status: 400 });

  const lastQuestion = messages[messages.length - 1].content;
  const apiKey = process.env.ANTHROPIC_API_KEY;

  // No key configured: answer from the built-in FAQ so the assistant still works.
  if (!apiKey) {
    return NextResponse.json({ reply: answerFromFaq(lastQuestion), mode: 'faq' });
  }

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 400,
        system: SYSTEM_PROMPT,
        messages,
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) throw new Error(`Model API returned ${res.status}`);
    const data = (await res.json()) as { content?: { type: string; text?: string }[] };
    const text = (data.content ?? [])
      .filter((c) => c.type === 'text' && c.text)
      .map((c) => c.text)
      .join('\n')
      .trim();
    return NextResponse.json({ reply: text || FALLBACK_ANSWER, mode: 'ai' });
  } catch {
    // Model unavailable or key invalid: degrade to the FAQ instead of an error.
    return NextResponse.json({ reply: answerFromFaq(lastQuestion), mode: 'faq' });
  }
}
