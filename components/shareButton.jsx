import { useState } from "react";

export default function ShareButton({ title, path }) {
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}${path}`;
  const text = `Looking for teammates: "${title}" on Forge. Join here: ${url}`;

  const share = async () => {
    if (navigator.share) {
      try { await navigator.share({ title, text, url }); return; } catch {}
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const copy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex gap-2">
      <button onClick={share} className="rounded-lg bg-lime-300 px-3 py-1.5 font-medium">
        Share on WhatsApp
      </button>
      <button onClick={copy} className="rounded-lg border px-3 py-1.5">
        {copied ? "Copied" : "Copy link"}
      </button>
    </div>
  );
}
