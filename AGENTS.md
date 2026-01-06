# AGENTS.md — Travel Coordination Frontend

This document describes the **intent, boundaries, and guiding principles** of the Travel Coordination frontend.

It is not a component inventory.  
It explains *how this app should behave and think*.

---

## What this frontend exists to do

This frontend exists to **present clarity**.

Its job is to:
- Collect messy, real-world travel input from users
- Display structured trip information returned by the backend
- Make assumptions, risks, and unknowns visible
- Produce outputs that can be copied, shared, and acted on immediately

The frontend is **not** responsible for:
- Interpreting raw travel data
- Making judgments about correctness
- Reconstructing trips
- Calling or prompting LLMs

Those responsibilities belong to the backend.

---

## Core product concept: Showing the Trip as an Object

The frontend’s primary responsibility is to **make the Trip tangible**.

A Trip should feel like:
- A single, coherent thing
- Easy to scan and understand
- Easy to explain to someone else (especially an executive)

UI design should reinforce that:
- The trip has a beginning, middle, and end
- Items belong to days
- Some things are known, some are inferred, some are missing
- Risks are signals, not alarms

If a UI change makes the trip feel more fragmented, it is likely wrong.

---

## Relationship with the backend (critical)

The backend is the **AI boundary**.

Frontend rules:
- Never call an LLM directly
- Never attempt to “fix,” reinterpret, or enrich AI output
- Never infer missing data on its own
- Never hide uncertainty returned by the backend

The frontend must treat the backend’s `TripReconstruction` response as:
> **Canonical, authoritative, and safe to render directly**

If something feels wrong in the output, the fix belongs in the backend.

---

## Rendering philosophy: Trust through transparency

This app builds trust by making uncertainty explicit.

The frontend must:
- Clearly label inferred items (e.g., “Inferred” badges)
- Always display assumptions made by the system
- Always surface missing information
- Prefer showing “Unknown” over guessing or hiding

Users should never wonder:
> “Did it make that up?”

If they do, the UI has failed.

---

## Executive-ready output is the product

A core use case is:
> “Can I copy this and send it to someone important?”

Therefore, the frontend should:
- Provide clean, readable summaries
- Support copy-to-clipboard actions
- Favor concise language over dense UI
- Avoid overwhelming dashboards

If a screen cannot be explained in 30 seconds, it is too complex.

---

## Week-1 MVP mindset

The Week-1 MVP (Magic Itinerary Reconstructor) is intentionally narrow.

Frontend responsibilities in MVP:
- Accept a large pasted text blob
- Trigger reconstruction
- Render:
  - Executive summary
  - Day-grouped timeline
  - Risk flags
  - Assumptions
  - Missing info

Frontend must **not**:
- Claim travel times
- Show maps
- Simulate bookings
- Pretend to be real-time

If something requires pretending we know more than we do, it is out of scope.

---

## UI tone and behavior

The UI should feel:
- Calm
- Professional
- Assistant-grade
- Non-alarming

Avoid:
- Red “error” language for normal uncertainty
- Overconfident phrasing
- Excessive animations or novelty

This product is used in **high-stakes contexts**.

---

## Error handling philosophy

When something goes wrong:
- Show one clear, human-readable message
- Offer a simple recovery action (“Try again”)
- Do not expose stack traces or provider errors
- Do not blame the user

Errors should feel rare, controlled, and respectful.

---

## Privacy and responsibility

This frontend handles sensitive personal and business information.

Rules:
- Do not log pasted travel text in production
- Do not store raw input in localStorage by default
- Avoid sending raw text to analytics tools
- Treat all user input as confidential by default

Privacy is part of trust.

---

## Design principles (non-negotiable)

When making decisions, prefer:

- Clarity over density
- Transparency over polish
- Explicit uncertainty over silent inference
- Copyable output over interactive complexity
- Calm over clever

This frontend exists to make users feel:
> “I understand this trip, and I’m in control.”

If a change moves away from that feeling, it’s the wrong change.

---

## Coding guidelines

## Prime Directives
1. **Prefer the simplest working solution** that fits existing patterns.
2. **Do not grow files unnecessarily** — refactor when a file starts to feel “heavy”.
3. **Avoid framework churn** (don’t introduce new libs/patterns unless asked).
4. **Keep behavior stable** — avoid breaking existing routes/response shapes.
5. **Leave the codebase cleaner than you found it** (remove dead code and unused imports).

---

## Frontend Architecture Rules (Next.js)
### Use shadcn/ui + Tailwind first
- Prefer composing existing shadcn components (Card, Tabs, Dialog, Drawer, Dropdown, Command, etc.)
- Add minimal custom components; if you do, keep them small and reusable.

### Data fetching + mutations
- Keep API calls in `src/lib/api-client.ts` or equivalent helpers.
- Avoid sprinkling fetch logic across UI components.
- Prefer optimistic updates only when safe and reversible.

### UI patterns
- Mobile-first responsive layout
- Use `Dialog` on desktop and `Drawer` on mobile when appropriate.
- Always show loading + error states for network actions.

---

## Naming + Types
- TypeScript everywhere.
- Public service functions should have explicit input/output types.
- Prefer `type` over `interface` for small shapes.
- Use consistent naming:
  - `createX`, `updateX`, `deleteX`, `getX`, `listX`
  - `buildXCreateInput`, `mapX`, `enrichX`

---

## Refactor Triggers (when Codex should proactively refactor)
Refactor if:
- Duplicate logic appears in >2 places (extract helper/integration/mapper).
- A module imports too many unrelated domains.

Refactor style:
- Prefer adding **1–3 helper files** (not big new folder trees) unless requested.
- Keep exports minimal.
- Avoid “utility dumping grounds”.

---

## Commands
- `pnpm install`
- `pnpm dev`
- `pnpm lint`
- `pnpm build`

---

## Security
- Never commit secrets or `.env*`.
- Frontend requests that require cookies must use `credentials: "include"`.

---

## Output Expectations (what Codex should provide)
When implementing a change, always output:
1. **Files changed** (list)
2. **Key behavior changes**
3. **How to run/verify**
4. If schema changed: migration steps + Prisma generate

Prefer small PR-sized changes over massive rewrites.

