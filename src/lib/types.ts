// Shapes shared by the server (which builds them) and the pages (which show them).

export type SessionStatus = 'done' | 'live' | 'upcoming';

export interface Session {
	key: number;
	meetingKey: number;
	/** e.g. "Practice 1", "Sprint Qualifying", "Race" */
	name: string;
	type: 'Practice' | 'Qualifying' | 'Race';
	start: string; // ISO date
	end: string;
}

export interface Meeting {
	key: number;
	round: number;
	name: string; // "Singapore Grand Prix"
	officialName: string;
	location: string;
	country: string;
	flag: string | null;
	circuitKey: number;
	circuitName: string;
	circuitInfoUrl: string | null;
	circuitImage: string | null;
	start: string;
	end: string;
	sessions: Session[];
}

export interface Driver {
	number: number;
	code: string; // "NOR"
	name: string; // "Lando Norris"
	team: string;
	colour: string; // "#F47600"
	headshot: string | null;
}

export interface Result {
	position: number | null;
	driver: Driver;
	laps: number;
	/** Practice/race: one time in seconds. Qualifying: [Q1, Q2, Q3], null where not set. */
	time: number | (number | null)[] | null;
	gap: number | (number | null)[] | string | null;
	points: number | null;
	status: 'ok' | 'dnf' | 'dns' | 'dsq';
}

export interface Track {
	/** SVG path data, already rotated, flipped and scaled into `viewBox` */
	path: string;
	viewBox: string;
	corners: { number: number; x: number; y: number }[];
	/** Where the start/finish line is, for the chequered marker */
	start: { x: number; y: number } | null;
}

export interface LapSeries {
	driver: Driver;
	/** Lap time in seconds per lap number (index 0 = lap 1); null when missing */
	times: (number | null)[];
	/** Position at the end of each lap */
	positions: (number | null)[];
	pitLaps: number[];
}
