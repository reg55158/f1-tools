import { error } from '@sveltejs/kit';
import { getSeason, getSeasonOrEmpty } from '#lib/server/openf1.ts';
import type { Meeting } from '#lib/types.ts';
import type { PageServerLoad } from './$types';

/** Finished races and sprints, newest first */
function races(season: Meeting[], now: number) {
	return season
		.flatMap((meeting) =>
			meeting.sessions
				.filter((s) => s.type === 'Race' && Date.parse(s.end) <= now)
				.map((session) => ({ meeting, session }))
		)
		.reverse();
}

export const load: PageServerLoad = async ({ setHeaders }) => {
	const now = Date.now();
	const year = new Date(now).getUTCFullYear();
	const season = await getSeason(year).catch(() => {
		error(503, 'Could not reach OpenF1. Try again in a minute.');
	});

	// Before this season's first race, offer last season's
	let list = races(season, now);
	let shownYear = year;
	if (list.length === 0) {
		list = races(await getSeasonOrEmpty(year - 1), now);
		shownYear = year - 1;
	}

	setHeaders({ 'cache-control': 'public, max-age=0, s-maxage=600, stale-while-revalidate=86400' });
	return {
		year: shownYear,
		races: list.map(({ meeting, session }) => ({
			key: session.key,
			name: session.name,
			start: session.start,
			meeting: { name: meeting.name, round: meeting.round, flag: meeting.flag }
		}))
	};
};
