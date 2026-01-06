# Travel Coordination — Frontend

An AI-powered travel coordination app designed for executive assistants and self-assisted executives.

The product helps people turn messy, fragmented travel information into a clear, structured trip that can be understood, explained, and acted on — without juggling emails, notes, calendars, and booking tools.

This repository contains the **Next.js frontend** for that experience.

---

## What this app is

Business travel today is managed as disconnected transactions:
- Flight confirmations in email
- Hotel details in apps
- Meeting info in calendars
- Notes scattered across Slack and docs

This app treats travel differently.

### The core idea: **Trip as an Object**
Instead of managing bookings, the app manages **the trip itself**:
- Why the trip exists
- When and where things happen
- What decisions were made and why
- What assumptions were inferred
- Where the risks or tight windows are
- What an executive needs to know right now

The output is not a dashboard — it’s **clarity**.

---

## Who it’s for

- **Executive assistants** coordinating high-value travel
- **Founders and executives** who plan their own work trips
- **Operators** who care more about outcomes than cheapest fares

The UX is assistant-first, but usable by anyone acting as their own assistant.

---

## What the final product will do

In its complete form, the app will:
- Convert unstructured inputs (emails, notes, intent) into structured trips
- Maintain a single, editable trip timeline (flights, lodging, meetings, notes)
- Track assumptions, decisions, and changes over time
- Generate executive-ready summaries (“what’s happening, what changed, what to do”)
- Flag risks like tight windows or missing information
- Act as a coordination layer — not a booking engine

AI is used to **reason about the trip**, not just extract fields.

---

## Week-1 MVP: Magic Itinerary Reconstructor

The first shippable feature proves the core thesis.

### What it does
A single-page experience where a user pastes a messy block of travel-related text (confirmation emails, notes, receipts) and gets back:
- A 2–3 sentence executive summary
- A clean, day-grouped itinerary
- Basic “tight window” warnings based on schedule gaps
- Explicit assumptions and missing information

No booking.  
No maps.  
No integrations.  

Just clarity from chaos.

---

## Architecture (high level)

- Frontend: Next.js (App Router) + TypeScript + Tailwind
- Backend: Express + Prisma + Better Auth + LLM endpoints
- Auth: Secure cookie sessions via backend (Better Auth)
- AI: Backend-owned prompting + strict schema validation

The frontend never calls the LLM directly.

---

## Running locally

```bash
pnpm install
pnpm dev
