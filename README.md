# Forge

Find your people. Build something real.

Forge is a platform where students discover project teams, apply to join with
a short intro, and manage applications — for hackathons, side projects, open
source, and everything in between.

## What is inside

- **Landing page** with a spotlight hero and a converging-skills visual
- **Discover Teams** — real search, category / experience / commitment
  filters, and sorting (newest, deadline, most open positions)
- **Team details** — apply to join, withdraw, or (as the owner) edit, close,
  and manage applications
- **Create / edit listings** with validation and live status control
- **Student profile** with a public preview of how owners see you
- **Dashboard** — your listings, incoming applications (accept / decline),
  and sent applications (withdraw)
- **Email + password auth** via Supabase, with automatic profile creation

## Tech stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- shadcn/ui components, Lucide icons
- Supabase (PostgreSQL, auth, Row Level Security)
- Server-side capacity enforcement through Postgres functions

## Local development

```bash
npm install
npm run dev
```

The dev server starts at `http://localhost:3000`. The Supabase URL and anon
key are injected by the Bolt environment — no `.env` setup is needed here.
See `.env.example` for the variable names if you deploy elsewhere.

## Database

The schema is applied through migrations (`create_forge_core_schema`,
`seed_forge_demo_data`, `harden_application_policies`):

- `profiles` — public read, owner-only write
- `team_posts` — public read, owner-only write
- `applications` — visible to the applicant and the listing owner only;
  applicants can withdraw pending applications; status changes by owners run
  through `accept_application` / `reject_application` Postgres functions that
  verify ownership and enforce team capacity atomically (simultaneous
  accepts cannot overfill a listing)
- `reports` — insert-only for users

Row Level Security is enabled on every table.

## Demo data

Six realistic demo listings (AI study planner, Rust CLI, SwiftUI app,
sustainability tracker, config linter, campus events) are seeded with demo
accounts so the product is explorable immediately. They are clearly labeled
as demo content on the homepage.

## Deployment

The project builds with `npm run build` and deploys to Netlify via the
included `netlify.toml`, or to any Next.js-compatible host. Set the four
Supabase environment variables from `.env.example` in your hosting provider.
