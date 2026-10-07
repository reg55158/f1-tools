// OpenF1 (schedule, results, laps) and MultiViewer (track maps), shaped into the types in
// #lib/types.ts. Field notes and limits are in PLAN.md.
//
// The free tier allows about 3 requests a second and 30 a minute, so every request goes through
// one queue that spaces them out, and every result is cached in memory. When a refresh fails
// (OpenF1 can refuse free-tier requests while a session is live), the last good value is served.

import { OPENF1_BASE } from '$app/env/private';
import type { Driver, LapSeries, Meeting, Result, Session, Standings, Track } from '#lib/types.ts';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

// ---------------------------------------------------------------------------------------------
// Raw API shapes (only the fields we use)

interface RawMeeting {
	meeting_key: number;
	meeting_name: string;
	meeting_official_name: string;
	location: string;
	country_name: string;
	country_flag?: string | null;
	circuit_key: number;
	circuit_short_name: string;
	circuit_info_url?: string | null;
	circuit_image?: string | null;
	date_start: string;
	date_end: string;
	year: number;
	is_cancelled?: boolean;
}

interface RawSession {
	session_key: number;
	meeting_key: number;
	session_name: string;
	session_type: string;
	date_start: string;
	date_end: string;
	year: number;
	is_cancelled?: boolean;
}

interface RawResult {
	position: number | null;
	driver_number: number;
	number_of_laps: number | null;
	dnf?: boolean;
	dns?: boolean;
	dsq?: boolean;
	duration: number | (number | null)[] | null;
	gap_to_leader: number | string | (number | string | null)[] | null;
	points?: number | null;
}

interface RawDriver {
	driver_number: number;
	name_acronym: string | null;
	full_name: string | null;
	team_name: string | null;
	team_colour: string | null;
	headshot_url: string | null;
}

interface RawLap {
	driver_number: number;
	lap_number: number;
	date_start: string | null;
	lap_duration: number | null;
	is_pit_out_lap: boolean | null;
}

interface RawLocation {
	x: number;
	y: number;
}

/** `/championship_drivers` and `/championship_teams` (beta): standings after a race or sprint */
interface RawStanding {
	driver_number?: number;
	team_name?: string;
	position_current: number | null;
	position_start: number | null;
	points_current: number | null;
}

interface RawCircuit {
	x: number[];
	y: number[];
	rotation?: number;
	corners?: { number: number; trackPosition: { x: number; y: number } }[];
}

// ---------------------------------------------------------------------------------------------
// Cache

interface Entry {
	value: unknown;
	expires: number;
}

const MAX_ENTRIES = 300;
const cache = new Map<string, Entry>();
const inflight = new Map<string, Promise<unknown>>();

function cached<T>(key: string, ttl: number, load: () => Promise<T>): Promise<T> {
	const hit = cache.get(key);
	if (hit && hit.expires > Date.now()) return Promise.resolve(hit.value as T);

	// Share one request between everyone asking for the same thing at once
	const running = inflight.get(key);
	if (running) return running as Promise<T>;

	const promise = load()
		.then((value) => {
			cache.delete(key); // re-insert so the Map's order stays oldest-first for eviction
			cache.set(key, { value, expires: Date.now() + ttl });
			if (cache.size > MAX_ENTRIES) cache.delete(cache.keys().next().value!);
			return value;
		})
		.catch((err) => {
			if (!hit) throw err;
			// Serve the stale value, and wait a minute before trying again
			hit.expires = Date.now() + MINUTE;
			return hit.value as T;
		})
		.finally(() => inflight.delete(key));

	inflight.set(key, promise);
	return promise;
}

// ---------------------------------------------------------------------------------------------
// Request queue

const MIN_GAP = 350; // ms between requests: just under 3 a second
const PER_MINUTE = 28; // a little under the limit of 30
const MAX_WAIT = 8_000; // rather fail than keep a page waiting longer than this

const recent: number[] = []; // start times of requests in the last minute
let queue: Promise<unknown> = Promise.resolve();

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Resolves when it's this request's turn; requests go one after another. */
function turn(): Promise<void> {
	const mine = queue.then(async () => {
		const now = Date.now();
		while (recent.length && recent[0] <= now - MINUTE) recent.shift();

		let wait = Math.max(0, (recent.at(-1) ?? 0) + MIN_GAP - now);
		if (recent.length >= PER_MINUTE) wait = Math.max(wait, recent[0] + MINUTE - now);
		if (wait > MAX_WAIT) throw new Error('OpenF1 rate limit reached; try again in a minute');

		await sleep(wait);
		recent.push(Date.now());
	});
	queue = mine.catch(() => {});
	return mine;
}

type Params = Record<string, string | number>;

/** OpenF1 filters such as `date>` are written without an `=`: `date>2026-03-08T05:00:00`. */
function queryString(params: Params): string {
	return Object.entries(params)
		.map(([key, value]) => {
			const v = encodeURIComponent(String(value));
			return /[<>]$/.test(key) ? `${key}${v}` : `${key}=${v}`;
		})
		.join('&');
}

async function openf1<T>(path: string, params: Params): Promise<T[]> {
	const url = `${OPENF1_BASE}${path}?${queryString(params)}`;

	for (let attempt = 0; ; attempt++) {
		await turn();
		const res = await fetch(url, {
			headers: { accept: 'application/json' },
			signal: AbortSignal.timeout(15_000)
		});

		if (res.status === 429 && attempt < 3) {
			const retryAfter = Number(res.headers.get('retry-after'));
			await sleep(retryAfter > 0 ? Math.min(retryAfter * 1000, MAX_WAIT) : 1000 * 2 ** attempt);
			continue;
		}
		// OpenF1 answers 404 when a filter matches nothing
		if (res.status === 404) return [];
		if (!res.ok) throw new Error(`OpenF1 ${path} answered ${res.status}`);
		return (await res.json()) as T[];
	}
}

// ---------------------------------------------------------------------------------------------
// Schedule

const isDone = (session: Session) => Date.parse(session.end) <= Date.now();

/** Done sessions don't change, so keep them a day; anything else a couple of minutes. */
const ttlFor = (session: Session) => (isDone(session) ? DAY : 2 * MINUTE);

function sessionType(raw: RawSession): Session['type'] {
	if (raw.session_type === 'Practice' || raw.session_type === 'Qualifying') return raw.session_type;
	if (raw.session_type === 'Race') return 'Race';
	return /quali/i.test(raw.session_name)
		? 'Qualifying'
		: /practice/i.test(raw.session_name)
			? 'Practice'
			: 'Race';
}

/** Every meeting of a season with its sessions, in date order, numbered by round. */
export function getSeason(year: number): Promise<Meeting[]> {
	return cached(`season:${year}`, HOUR, async () => {
		const meetings = await openf1<RawMeeting>('/meetings', { year });
		const sessions = await openf1<RawSession>('/sessions', { year });

		return meetings
			.filter((m) => !m.is_cancelled && !/testing/i.test(m.meeting_name))
			.sort((a, b) => Date.parse(a.date_start) - Date.parse(b.date_start))
			.map((m, i): Meeting => ({
				key: m.meeting_key,
				round: i + 1,
				name: m.meeting_name,
				officialName: m.meeting_official_name,
				location: m.location,
				country: m.country_name,
				flag: m.country_flag ?? null,
				circuitKey: m.circuit_key,
				circuitName: m.circuit_short_name,
				circuitInfoUrl: m.circuit_info_url ?? null,
				circuitImage: m.circuit_image ?? null,
				start: m.date_start,
				end: m.date_end,
				sessions: sessions
					.filter((s) => s.meeting_key === m.meeting_key && !s.is_cancelled)
					.sort((a, b) => Date.parse(a.date_start) - Date.parse(b.date_start))
					.map((s) => ({
						key: s.session_key,
						meetingKey: s.meeting_key,
						name: s.session_name,
						type: sessionType(s),
						start: s.date_start,
						end: s.date_end
					}))
			}));
	});
}

/** The season for a year, or an empty list if OpenF1 has nothing for it yet. */
export async function getSeasonOrEmpty(year: number): Promise<Meeting[]> {
	try {
		return await getSeason(year);
	} catch {
		return [];
	}
}

export async function getMeeting(key: number): Promise<Meeting | null> {
	const year = await cached(`meeting-year:${key}`, DAY, async () => {
		const [raw] = await openf1<RawMeeting>('/meetings', { meeting_key: key });
		return raw ? new Date(raw.date_start).getUTCFullYear() : null;
	});
	if (year === null) return null;
	return (await getSeason(year)).find((m) => m.key === key) ?? null;
}

export async function getSession(
	key: number
): Promise<{ meeting: Meeting; session: Session } | null> {
	const meetingKey = await cached(`session-meeting:${key}`, DAY, async () => {
		const [raw] = await openf1<RawSession>('/sessions', { session_key: key });
		return raw?.meeting_key ?? null;
	});
	if (meetingKey === null) return null;

	const meeting = await getMeeting(meetingKey);
	const session = meeting?.sessions.find((s) => s.key === key);
	return meeting && session ? { meeting, session } : null;
}

// ---------------------------------------------------------------------------------------------
// Drivers and results

function unknownDriver(number: number): Driver {
	return {
		number,
		code: String(number),
		name: `Car ${number}`,
		team: '',
		colour: '#7a8a99',
		headshot: null
	};
}

export function getDrivers(session: Session): Promise<Map<number, Driver>> {
	return cached(`drivers:${session.key}`, ttlFor(session), async () => {
		const raw = await openf1<RawDriver>('/drivers', { session_key: session.key });
		return new Map(
			raw.map((d) => [
				d.driver_number,
				{
					number: d.driver_number,
					code: d.name_acronym ?? String(d.driver_number),
					name: d.full_name ?? `Car ${d.driver_number}`,
					team: d.team_name ?? '',
					colour: d.team_colour ? `#${d.team_colour.replace(/^#/, '')}` : '#7a8a99',
					headshot: d.headshot_url ?? null
				}
			])
		);
	});
}

export function getResults(session: Session): Promise<Result[]> {
	return cached(`results:${session.key}`, ttlFor(session), async () => {
		const drivers = await getDrivers(session);
		const raw = await openf1<RawResult>('/session_result', { session_key: session.key });

		return raw
			.map((r): Result => ({
				position: r.position ?? null,
				driver: drivers.get(r.driver_number) ?? unknownDriver(r.driver_number),
				laps: r.number_of_laps ?? 0,
				time: r.duration ?? null,
				gap: (r.gap_to_leader as Result['gap']) ?? null,
				points: r.points ?? null,
				status: r.dsq ? 'dsq' : r.dns ? 'dns' : r.dnf ? 'dnf' : 'ok'
			}))
			.sort((a, b) => (a.position ?? 999) - (b.position ?? 999));
	});
}

// ---------------------------------------------------------------------------------------------
// Championship standings

/** Standings after the latest finished race or sprint of the season, or null if there are none. */
export async function getStandings(season: Meeting[]): Promise<Standings | null> {
	const races = season
		.flatMap((meeting) => meeting.sessions.map((session) => ({ meeting, session })))
		.filter(({ session }) => session.type === 'Race' && isDone(session));

	// OpenF1 publishes the standings a little while after the flag, so fall back one race until then
	for (const { meeting, session } of races.slice(-2).reverse()) {
		const standings = await cached(`standings:${session.key}`, ttlFor(session), async () => {
			const [drivers, rawDrivers, rawTeams] = await Promise.all([
				getDrivers(session),
				openf1<RawStanding>('/championship_drivers', { session_key: session.key }),
				openf1<RawStanding>('/championship_teams', { session_key: session.key })
			]);
			// Thrown rather than returned, so an empty answer isn't cached for a day
			if (rawDrivers.length === 0) throw new Error(`No standings after session ${session.key} yet`);

			const change = (s: RawStanding) =>
				s.position_start !== null && s.position_current !== null
					? s.position_start - s.position_current
					: 0;
			const byPosition = (a: RawStanding, b: RawStanding) =>
				(a.position_current ?? 999) - (b.position_current ?? 999);
			// Team colours come from the drivers, since the teams endpoint has none
			const teamColour = (team: string) =>
				[...drivers.values()].find((d) => d.team === team)?.colour ?? '#7a8a99';

			return {
				after: { meetingKey: meeting.key, meetingName: meeting.name, sessionName: session.name },
				drivers: rawDrivers
					.filter((s) => s.driver_number !== undefined)
					.sort(byPosition)
					.map((s) => ({
						position: s.position_current ?? 0,
						driver: drivers.get(s.driver_number!) ?? unknownDriver(s.driver_number!),
						points: s.points_current ?? 0,
						change: change(s)
					})),
				teams: rawTeams
					.filter((s) => s.team_name)
					.sort(byPosition)
					.map((s) => ({
						position: s.position_current ?? 0,
						team: s.team_name!,
						colour: teamColour(s.team_name!),
						points: s.points_current ?? 0,
						change: change(s)
					}))
			};
		}).catch(() => null);
		if (standings) return standings;
	}
	return null;
}

// ---------------------------------------------------------------------------------------------
// Laps

function getRawLaps(session: Session): Promise<RawLap[]> {
	return cached(`laps:${session.key}`, ttlFor(session), () =>
		openf1<RawLap>('/laps', { session_key: session.key })
	);
}

/** Lap times, positions and pit stops for every driver, ordered by where they finished. */
export async function getLapSeries(session: Session): Promise<LapSeries[]> {
	const [laps, drivers] = await Promise.all([getRawLaps(session), getDrivers(session)]);
	const total = laps.reduce((max, lap) => Math.max(max, lap.lap_number), 0);

	const byDriver = new Map<number, RawLap[]>();
	for (const lap of laps) {
		if (!byDriver.has(lap.driver_number)) byDriver.set(lap.driver_number, []);
		byDriver.get(lap.driver_number)!.push(lap);
	}

	// When each driver crossed the line at the end of each lap: the lap's start plus its time,
	// or failing that the next lap's start.
	const crossings = new Map<number, (number | null)[]>();
	for (const [number, driverLaps] of byDriver) {
		const byLap = new Map(driverLaps.map((lap) => [lap.lap_number, lap]));
		const ends: (number | null)[] = [];
		for (let n = 1; n <= total; n++) {
			const lap = byLap.get(n);
			const next = byLap.get(n + 1);
			if (lap?.date_start && lap.lap_duration) {
				ends.push(Date.parse(lap.date_start) + lap.lap_duration * 1000);
			} else if (lap && next?.date_start) {
				ends.push(Date.parse(next.date_start));
			} else {
				ends.push(null);
			}
		}
		crossings.set(number, ends);
	}

	// Position after lap n = order of crossing the line among everyone who completed lap n
	const positions = new Map<number, (number | null)[]>(
		[...crossings.keys()].map((number) => [number, Array(total).fill(null)])
	);
	for (let i = 0; i < total; i++) {
		[...crossings]
			.filter(([, ends]) => ends[i] !== null)
			.sort(([, a], [, b]) => a[i]! - b[i]!)
			.forEach(([number], rank) => (positions.get(number)![i] = rank + 1));
	}

	const series = [...byDriver].map(([number, driverLaps]): LapSeries => {
		const times: (number | null)[] = Array(total).fill(null);
		const pitLaps: number[] = [];
		for (const lap of driverLaps) {
			times[lap.lap_number - 1] = lap.lap_duration ?? null;
			// A pit-out lap means the driver came in at the end of the lap before
			if (lap.is_pit_out_lap && lap.lap_number > 1) pitLaps.push(lap.lap_number - 1);
		}
		return {
			driver: drivers.get(number) ?? unknownDriver(number),
			times,
			positions: positions.get(number)!,
			pitLaps: pitLaps.sort((a, b) => a - b)
		};
	});

	// Finishing order: most laps first, then the position on their last lap
	const finish = (s: LapSeries) => {
		const last = s.positions.findLastIndex((p) => p !== null);
		return last === -1 ? Infinity : (total - last) * 100 + s.positions[last]!;
	};
	return series.sort((a, b) => finish(a) - finish(b));
}

// ---------------------------------------------------------------------------------------------
// Track maps

const TRACK_SIZE = 1000; // the longer side of the map, in viewBox units
const TRACK_PAD = 60;

function buildTrack(
	xs: number[],
	ys: number[],
	rotation: number,
	corners: { number: number; x: number; y: number }[]
): Track | null {
	if (xs.length < 10) return null;

	// Rotate so the map faces the way TV graphics show it, then flip y (SVG y points down)
	const rad = (rotation * Math.PI) / 180;
	const cos = Math.cos(rad);
	const sin = Math.sin(rad);
	const turn = (x: number, y: number) => [x * cos - y * sin, -(x * sin + y * cos)];

	const points = xs.map((x, i) => turn(x, ys[i]));
	const minX = Math.min(...points.map((p) => p[0]));
	const maxX = Math.max(...points.map((p) => p[0]));
	const minY = Math.min(...points.map((p) => p[1]));
	const maxY = Math.max(...points.map((p) => p[1]));
	const scale = TRACK_SIZE / Math.max(maxX - minX, maxY - minY, 1);

	const fit = ([x, y]: number[]) => ({
		x: Math.round((x - minX) * scale * 10) / 10,
		y: Math.round((y - minY) * scale * 10) / 10
	});
	const fitted = points.map(fit);
	const width = Math.ceil((maxX - minX) * scale);
	const height = Math.ceil((maxY - minY) * scale);

	return {
		path: 'M' + fitted.map((p) => `${p.x} ${p.y}`).join('L') + 'Z',
		viewBox: `${-TRACK_PAD} ${-TRACK_PAD} ${width + 2 * TRACK_PAD} ${height + 2 * TRACK_PAD}`,
		corners: corners.map((c) => ({ number: c.number, ...fit(turn(c.x, c.y)) })),
		start: fitted[0]
	};
}

async function multiViewerTrack(url: string): Promise<Track | null> {
	const res = await fetch(url, {
		headers: { accept: 'application/json', 'user-agent': 'f1.reg58.me' },
		signal: AbortSignal.timeout(10_000)
	});
	if (!res.ok) return null; // new venues aren't there yet
	const circuit = (await res.json()) as RawCircuit;
	return buildTrack(
		circuit.x,
		circuit.y,
		circuit.rotation ?? 0,
		(circuit.corners ?? []).map((c) => ({ number: c.number, ...c.trackPosition }))
	);
}

/** Fallback for venues MultiViewer doesn't know: trace the fastest lap of a completed session. */
async function tracedTrack(meeting: Meeting): Promise<Track | null> {
	const preference = ['Qualifying', 'Race', 'Practice'];
	const session = meeting.sessions
		.filter(isDone)
		.sort((a, b) => preference.indexOf(a.type) - preference.indexOf(b.type))[0];
	if (!session) return null;

	const fastest = (await getRawLaps(session))
		.filter((lap) => lap.date_start && lap.lap_duration && !lap.is_pit_out_lap)
		.sort((a, b) => a.lap_duration! - b.lap_duration!)[0];
	if (!fastest) return null;

	const start = Date.parse(fastest.date_start!);
	const points = await openf1<RawLocation>('/location', {
		session_key: session.key,
		driver_number: fastest.driver_number,
		'date>': new Date(start).toISOString(),
		'date<': new Date(start + fastest.lap_duration! * 1000).toISOString()
	});
	return buildTrack(
		points.map((p) => p.x),
		points.map((p) => p.y),
		0,
		[]
	);
}

export function getTrack(meeting: Meeting): Promise<Track | null> {
	const year = new Date(meeting.start).getUTCFullYear();
	return cached(`track:${meeting.circuitKey}:${year}`, DAY, async () => {
		const track = meeting.circuitInfoUrl
			? await multiViewerTrack(meeting.circuitInfoUrl).catch(() => null)
			: null;
		if (track) return track;
		const traced = await tracedTrack(meeting);
		if (traced) return traced;
		// Nothing to draw yet (e.g. a new venue before any running): throw so the next request tries
		// again, instead of caching "no map" for a day
		throw new Error(`No track map for ${meeting.name} yet`);
	});
}
