import { error } from '@sveltejs/kit';
import { meetingEnd } from '#lib/format.ts';
import { getResults, getSeason, getSeasonOrEmpty, getTrack } from '#lib/server/openf1.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ setHeaders }) => {
	const now = Date.now();
	const year = new Date(now).getUTCFullYear();

	const season = await getSeason(year).catch(() => {
		error(503, 'Could not reach OpenF1 for the schedule. Try again in a minute.');
	});

	// After the last race of the year, look ahead to next season once it's published
	const next =
		season.find((m) => meetingEnd(m) > now) ??
		(await getSeasonOrEmpty(year + 1)).find((m) => meetingEnd(m) > now) ??
		null;

	// The most recent finished session, which may belong to the previous weekend
	let last = null;
	for (const meeting of season) {
		for (const session of meeting.sessions) {
			if (Date.parse(session.end) <= now) last = { meeting, session };
		}
	}

	// Results and the map are extras: show the page without them rather than fail
	const [results, track] = await Promise.all([
		last ? getResults(last.session).catch(() => null) : null,
		next ? getTrack(next).catch(() => null) : null
	]);

	setHeaders({ 'cache-control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=600' });

	return { now, next, last: last && { ...last, results }, track, lastRace: season.at(-1) ?? null };
};
