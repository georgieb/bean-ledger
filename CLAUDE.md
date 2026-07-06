# Bean Ledger

Coffee roasting/brewing management app built on an immutable ledger: all state changes
are appended as ledger entries and current state is derived from history. See `README.md`
and `docs/` for architecture detail.

## Stack & commands
- Next.js + TypeScript, Drizzle ORM, Supabase Postgres, Anthropic SDK for AI features.
- `npm run dev` — local dev · `npm run typecheck` + `npm run lint` — run both before
  calling any change done · `npm run build` — production check.
- Schema changes: edit Drizzle schema, then `npm run db:generate` + `npm run db:migrate`.
  Migrations live in `drizzle/`.

## Rules
- **Never mutate or delete ledger entries.** Corrections are new compensating entries;
  state is always recomputed from the ledger.
- Schema/DB changes go through Drizzle migrations — no ad-hoc SQL against Supabase
  (one-off scripts like the `.sql`/`check-*.js` files at repo root are legacy).
- Validate external input with zod at the boundary, matching existing patterns in `src/`.
