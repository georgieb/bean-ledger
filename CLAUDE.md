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

## Who this app is for
Two user segments, both first-class — never design a feature that only serves one:
1. **Home roasters** — own a roaster (any brand/model, not just Fresh Roast), a grinder,
   and a brewer. Need equipment-aware roasting AND brewing guidance.
2. **Coffee appreciators** — buy already-roasted coffee, own a grinder and a brewer,
   never roast. Need brewing guidance only; roasting features must not block or clutter
   their flow (e.g. equipment onboarding must not require a roaster).

## Before editing equipment or AI-prompt features
Equipment/AI code touches every brand and model in the catalog (`equipment-catalog.ts`)
and both user segments above. Before writing the change, answer in your response:
1. **Who benefits?** If the answer is "one brand" or "one segment," redesign it as a
   catalog-driven property (like `accessories`) instead of a hardcoded name/brand check,
   so every current and future brand/model gets it for free.
2. **Does it degrade gracefully for equipment/segments it doesn't apply to?** e.g. a
   roaster-only field must be invisible/inert for brewer-only (non-roasting) users.
3. **Does a data-driven, catalog/profile-based design already exist for this?** Prefer
   extending `equipment-catalog.ts` / `settings_schema` / the AI equipment-profile system
   (`equipment-ai-profile.ts`) over one-off hardcoded branches in a route or component.

## Rules
- **Never mutate or delete ledger entries.** Corrections are new compensating entries;
  state is always recomputed from the ledger.
- Schema/DB changes go through Drizzle migrations — no ad-hoc SQL against Supabase
  (one-off scripts like the `.sql`/`check-*.js` files at repo root are legacy).
- Validate external input with zod at the boundary, matching existing patterns in `src/`.
