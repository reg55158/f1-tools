// Formatting shared by the server render and the browser. Anything that depends on the viewer's
// time zone takes `local`: false while rendering on the server and during hydration (UTC, fixed
// locale, so both sides print the same text), true once the page has mounted.

import type { Meeting, Session, SessionStatus } from '#lib/types.ts';

export function sessionStatus(session: Session, now: number): SessionStatus {
	if (now >= Date.parse(session.end)) return 'done';
	if (now >= Date.parse(session.start)) return 'live';
	return 'upcoming';
}

/** "Practice 1" → "FP1", "Sprint Qualifying" → "Sprint Quali" */
export function shortName(name: string): string {
	const practice = /^Practice (\d)$/.exec(name);
	if (practice) return `FP${practice[1]}`;
	return name
		.replace('Sprint Qualifying', 'Sprint Quali')
		.replace('Sprint Shootout', 'Sprint Quali');
}

export function meetingEnd(meeting: Meeting): number {
	return Math.max(Date.parse(meeting.end), ...meeting.sessions.map((s) => Date.parse(s.end)));
}

function formatter(local: boolean, options: Intl.DateTimeFormatOptions) {
	return new Intl.DateTimeFormat(local ? undefined : 'en-GB', {
		...options,
		timeZone: local ? undefined : 'UTC'
	});
}

/** "Sun 5 Oct, 14:00" in the viewer's time zone, or "Sun 5 Oct, 12:00 UTC" before mounting. */
export function formatDateTime(iso: string, local: boolean): string {
	const text = formatter(local, {
		weekday: 'short',
		day: 'numeric',
		month: 'short',
		hour: '2-digit',
		minute: '2-digit'
	}).format(new Date(iso));
	return local ? text : `${text} UTC`;
}

/** "3–5 Oct" (the weekend's dates; UTC is close enough for a date range) */
export function formatDateRange(start: string, end: string): string {
	const a = new Date(start);
	const b = new Date(end);
	const day = (d: Date) => d.getUTCDate();
	const month = (d: Date) => d.toLocaleString('en-GB', { month: 'short', timeZone: 'UTC' });
	return a.getUTCMonth() === b.getUTCMonth()
		? `${day(a)}–${day(b)} ${month(b)}`
		: `${day(a)} ${month(a)} – ${day(b)} ${month(b)}`;
}

/** "2d 04:12:09", or "04:12:09" under a day */
export function formatCountdown(ms: number): string {
	const total = Math.max(0, Math.floor(ms / 1000));
	const days = Math.floor(total / 86400);
	const pad = (n: number) => String(n).padStart(2, '0');
	const clock = `${pad(Math.floor((total % 86400) / 3600))}:${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}`;
	return days > 0 ? `${days}d ${clock}` : clock;
}

/** 83.456 → "1:23.456"; 5432.1 → "1:30:32.100" */
export function formatLapTime(seconds: number | null | undefined): string {
	if (seconds === null || seconds === undefined) return '–';
	const h = Math.floor(seconds / 3600);
	const m = Math.floor((seconds % 3600) / 60);
	const s = (seconds % 60).toFixed(3).padStart(6, '0');
	return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}

/** Gap to the leader: seconds as "+1.234", or OpenF1's own text such as "+1 LAP" */
export function formatGap(gap: number | string | null | undefined): string {
	if (gap === null || gap === undefined || gap === 0) return '';
	if (typeof gap === 'string') return gap;
	return `+${gap.toFixed(3)}`;
}
