# f1-tools plan

An F1 companion site for **f1.reg58.me**, in the Gulf livery look of reg58.me
(Gulf blue `#8dcdf0`, orange `#ff6a13`, navy `#0b1722`; orange nav and footer with a navy stripe).
It will be linked from reg58.me's Projects page.

Stack: same as reg58.me. SvelteKit 3 + Svelte 5 runes + TypeScript, `@sveltejs/adapter-vercel`,
`#lib/...` imports with `.ts` extensions, config inside `vite.config.ts`. No runtime dependencies
if possible. (Vercel's Node can't `require()` ES modules, so check any server dependency with
`node --no-experimental-require-module` first.)

## Pages

- **`/` Next race**
  - Meeting name, flag, circuit and round.
  - A big countdown to the next session.
  - The full weekend list (FP1, FP2, FP3, Sprint Qualifying, Sprint, Qualifying, Race) in the
    viewer's local time, each with its own countdown and a done/live/upcoming state.
  - Track map.
  - Results of the **last completed session**.
- **`/calendar`**: all meetings of the season. Past ones are dimmed and the next one is
  highlighted; each links to its weekend page.
- **`/race/[meeting]`**: one weekend: track map, sessions as tabs, results table for each
  completed session.
- **`/laps` and `/laps/[session]`**: lap charts for a Race or Sprint.
  - Lap-time line chart and position chart.
  - Driver chips coloured by team.
  - "Hide slow laps" toggle, which drops laps over 107% of the driver's median: pit stops and
    safety cars.
  - Hovering a lap shows every selected driver's time for that lap.

## Data sources (checked 2026-10-07)

### OpenF1: `https://api.openf1.org/v1`

CORS is open. The free tier allows about 3 requests a second and 30 a minute, so cache on the
server and space requests out. Live data during a session may be refused on the free tier, so
handle errors gracefully.

- `/meetings?year=2026` returns 27 meetings. Skip any with `is_cancelled` (Bahrain 1282, Saudi
  1283) and the "Pre-Season Testing" ones.
  - Fields: `meeting_key, meeting_name, meeting_official_name, location, country_name,
    country_flag (png url), circuit_key, circuit_short_name, circuit_info_url (MultiViewer),
    circuit_image, gmt_offset, date_start, date_end`.
  - Round number is the order after filtering.
- `/sessions?year=2026` gives every session in one call.
  - Fields: `session_key, meeting_key, session_name ("Practice 1", "Sprint Qualifying",
    "Sprint", "Qualifying", "Race"), session_type, date_start, date_end, is_cancelled`.
- `/session_result?session_key=X` gives `position, driver_number, number_of_laps, dnf, dns,
  dsq, duration, gap_to_leader, points`.
  - Practice and Race: `duration` is a number (best lap or race time, in seconds).
  - Qualifying: `duration` and `gap_to_leader` are `[Q1, Q2, Q3]` arrays.
  - `session_key=latest` works.
- `/drivers?session_key=X` gives `driver_number, name_acronym, full_name, team_name,
  team_colour (hex without #), headshot_url`.
- `/laps?session_key=X` gives all drivers in one call: `driver_number, lap_number, date_start,
  lap_duration (can be null), is_pit_out_lap, duration_sector_1..3`.
  - Positions per lap: rank drivers by when they crossed the line (`date_start + lap_duration`,
    or the next lap's `date_start`).
- `/location?session_key=X&driver_number=N&date>A&date<B` gives about 390 points over one lap
  (`x, y, z`).

### Track maps: MultiViewer (`circuit_info_url`, e.g. `https://api.multiviewer.app/api/v1/circuits/61/2026`)

- Fields: `x[], y[], rotation (degrees), corners[{number, trackPosition{x,y}}]`.
- Rotate by `rotation`, then flip y for SVG.
- New venues return 404, for example Sepang, circuit 12, used by meeting 1308 "Bahrain Grand
  Prix" held in Kuala Lumpur. Fallback: take the fastest lap in that meeting's qualifying (from
  `/laps`), fetch `/location` for that driver over that lap, and draw that. The coordinates are
  the same as MultiViewer's. Last resort: `circuit_image`.

## Implementation notes

- Countdowns and local times must render the same on the server and in the browser to avoid
  hydration mismatches. Render in UTC (or a placeholder) on the server, then switch to the
  viewer's local time in `onMount`, ticking every second.
- Cache headers:
  - home: `s-maxage=60`
  - completed-session pages: `s-maxage=86400`
  - plus an in-memory cache in `src/lib/server/openf1.ts`.
- Shared types are in `src/lib/types.ts`.
- `OPENF1_BASE` (optional env var, see `src/env.ts`) points the server at another OpenF1, e.g. a
  local mock for testing without network access.
- When an OpenF1 refresh fails, the in-memory cache serves the last good value for another minute.
- `fetch` percent-encodes `>`/`<` in the query (`date%3E...`), the same as a browser does.

## Deploy

1. Create the Vercel project `f1-tools` (account reg55158) from the GitHub repo.
2. Add the domain `f1.reg58.me` in Vercel.
3. Add a CNAME in Cloudflare DNS: `f1` pointing to `cname.vercel-dns.com`, DNS only (grey cloud).
   The user does this step by hand.
4. Add the "Visit" link on reg58.me: set the repo's GitHub homepage to https://f1.reg58.me. The
   site's cards read the homepage field automatically.
