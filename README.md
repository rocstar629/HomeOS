# FamilyOS

FamilyOS is a family-focused interface built on top of Home Assistant.

**Home Assistant provides the infrastructure. FamilyOS provides the family-friendly experience.**

Normal family members never see entity IDs, YAML, integrations, or automations —
just People, Places, Home, Today, Calendar, Tasks, and Energy.

## Status

Implemented:

- **Today** — who's home/away, weather, home status, upcoming calendar events, tasks
- **Family** — profile cards with place, battery, GPS accuracy; detail view
- **Map** — family members and HA zones on an interactive map (MapLibre + OSM)
- **Home** — device controls (lights, switches, locks, covers), alarm arm/disarm
  with optional PIN, live camera snapshots
- **Calendar** — next 7 days grouped by Today/Tomorrow/day
- **Tasks** — household to-do lists with completion toggles (writes back to HA)
- **Energy** — live power/solar readings from HA sensors (hides when none exist)
- **Settings** — enter Home Assistant URL + token **in the app after deploy**;
  credentials are stored server-side only and never reach the browser
- **Live updates** — Home Assistant `state_changed` events stream to the browser over SSE
- **Demo mode** — full UI with realistic fictional data, no Home Assistant required

## Technology

- TypeScript (strict), Next.js App Router, React, Tailwind CSS
- TanStack Query for server state
- MapLibre GL with OpenStreetMap street tiles (no API key)
- Vitest for tests

## Getting Started

### Prerequisites

- Node.js 22+ (Node 20.9+ required by Next.js 16)
- npm

### Local development

```bash
npm install
npm run dev
```

Open http://localhost:3000. With no configuration the app runs in **demo mode**
with fictional data (two adults, kids, home/school/work places).

### Connecting Home Assistant

Copy `.env.example` to `.env.local`:

```env
HOME_ASSISTANT_URL=http://homeassistant.local:8123
HOME_ASSISTANT_TOKEN=your_long_lived_access_token
# Optional: force demo data even when HA is configured
# NEXT_PUBLIC_USE_MOCK=true
```

Create the token in Home Assistant under your user profile → *Security* →
*Long-lived access tokens*.

The app discovers people, zones, lights, locks, covers, switches, climate,
cameras, alarms, weather, calendars, and to-do lists **dynamically** — no
hard-coded entity IDs.

### Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Start production build |
| `npm run lint` / `lint:fix` | ESLint |
| `npm run typecheck` | TypeScript, no emit |
| `npm test` | Vitest (normalization layer) |

## Architecture

```
Browser ──(no credentials)──▶ Next.js API routes ──(token, server-only)──▶ Home Assistant
   ▲                              │
   └───── SSE /api/ha/events ─────┘   (server holds the HA WebSocket,
                                        forwards state_changed events)
```

- `src/lib/homeassistant/client.ts` — browser client; calls only same-origin `/api/ha/*`
- `src/lib/homeassistant/server.ts` — server-only HA access, service allowlist, input sanitization
- `src/lib/homeassistant/normalization.ts` — raw HA entities → FamilyOS models (`Person`, `Place`, `HomeSummary`, …)
- `src/lib/homeassistant/events.ts` — SSE subscription with automatic reconnection
- `src/lib/homeassistant/mock.ts` — demo data, never mixed with live data
- `src/hooks/useFamilyData.ts` — derived hooks (people, places, devices, summary, weather, calendar, tasks)
- `src/context/HomeAssistantContext.tsx` — connection status + live invalidation
- `src/app/api/ha/*` — config, states, service, calendars, todos, events (SSE)

All UI consumes normalized models only; components never touch raw entity IDs
except as opaque keys.

## Security assumptions

- **Credentials never reach the browser.** `HOME_ASSISTANT_URL`/`TOKEN` are read
  only inside server modules (`server.ts`, marked `server-only`) — whether they
  come from environment variables or from the **Settings** screen (saved to
  `data/ha-config.json`, mode `0600`, outside the web root). The client bundle
  contains no HA URL or token.
- Service calls are validated server-side: domain/service **allowlist**,
  `entity_id` pattern checks, and sanitization of service data.
- The config endpoint exposes only booleans (`useMock`, `configured`).
- Tokens are never logged; error messages contain no credentials.
- Demo mode and live data are strictly separated.
- Deployment should terminate TLS in front of the app and restrict network
  access to Home Assistant to the app host.

Known limitations (documented, not fake): authentication today is a static
long-lived token in env vars; a proper onboarding/OAuth flow is planned, and
the connection layer is structured so the auth mechanism can be swapped
without touching UI code.

Known limitations (documented, not fake): authentication today is a static
long-lived token (env vars or the Settings screen); a proper onboarding/OAuth
flow is planned, and the connection layer is structured so the auth mechanism
can be swapped without touching UI code.

## Docker / Unraid

CI builds and publishes the image to GitHub Container Registry on every push
to `main`:

```text
ghcr.io/rocstar629/homeos:latest
```

Run it (credentials go in the app via **Settings**, no env vars required):

```bash
docker run -d \
  --name familyos \
  -p 3000:3000 \
  -v /mnt/user/appdata/familyos/data:/app/data \
  ghcr.io/rocstar629/homeos:latest
```

Then open `http://<your-server>:3000`, go to **Settings**, and paste your
Home Assistant URL + long-lived access token.

Notes:

- The `/app/data` volume persists the credentials saved from the Settings
  screen across container updates.
- **Permissions are handled automatically:** on start the container fixes
  ownership of the mounted data folder (as root), then drops to the unprivileged
  app user (uid 1001). No manual `chown` is needed.
  *(Old images don't do this — if saving settings fails with `EACCES`, run
  `chown -R 1001:1001 <host-path>/data` on the server or update the image.)*
- First time only: the GHCR package starts as **private**. Make it public at
  https://github.com/rocstar629/HomeOS/pkgs/container/homeos
  (Package settings → Change visibility → Public) so Unraid can pull without
  a registry login.
- On Unraid: *Docker → Add Container*, image `ghcr.io/rocstar629/homeos:latest`,
  port `3000→3000`, path `/app/data` mapped to a folder under `/mnt/user/appdata`.

The image runs Next.js standalone output; it starts as root only long enough
to fix data-folder ownership, then runs the server as uid 1001 (`nextjs`).

## Roadmap (not yet built)

Energy history charts (per-day statistics), location history/ETA, arrival
alerts, native iOS/iPadOS app, push notifications, richer camera views.
See the product spec; Home Assistant remains the backend of record for all
of these.
