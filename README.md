# Forge

Find your people. Build something real.

Forge is a platform where students discover project teams, apply to join with
a short intro, and manage applications, for hackathons, side projects, open
source, and everything in between.

## Features

- **Discover Teams**: search, filter by category / experience / commitment, and sort by newest, deadline, or open positions
- **Team details**: apply, withdraw, or (as owner) edit, close, and manage applications
- **Create / edit listings** with validation and status control
- **Student profiles** with a preview of how owners see you
- **Dashboard**: your listings, incoming applications (accept / decline), sent applications (withdraw)
- **Friends**: send, accept, and remove friend requests
- **Messages**: 1-to-1 chat, only between accepted friends
- **Notifications**: application updates, with a bell in the navbar
- **Global search** for people and projects
- **Email + password auth** via Supabase, with automatic profile creation

## Tech stack

- Next.js 13 (App Router), TypeScript, Tailwind CSS
- shadcn/ui, Lucide icons
- Supabase (PostgreSQL, Auth, Row Level Security)

## Getting started

1. Create a Supabase project.
2. Run the SQL files in `supabase/migrations/` in filename order (or `supabase/setup_all_in_one.sql` on a fresh project).
3. Copy the env template and fill it in:

```bash
cp .env.example .env.local
```

4. Install and run:

```bash
npm install
npm run dev
```

The dev server starts at http://localhost:3000.

## Database and security

Row Level Security is enabled on every table.

- `profiles`: public read, owner-only write
- `team_posts`: public read, owner-only write
- `applications`: visible only to the applicant and the listing owner. Owners accept or reject through `accept_application` / `reject_application`, which verify ownership and enforce team capacity atomically.
- `friendships`: visible only to the two people involved. Accepting goes through `accept_friend_request`.
- `messages`: readable only by sender and recipient, and sendable only between accepted friends. No edit policy; read receipts go through `mark_conversation_read`.
- `reports`: insert-only for users

## Demo data

Demo rows are flagged with `is_demo`. Remove them before launch with `supabase/remove_demo_data.sql`.

## Deployment

Builds with `npm run build`. Deploys to Netlify via the included `netlify.toml`, or to any Next.js host. Set the two variables from `.env.example` in your hosting provider.
