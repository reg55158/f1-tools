import { error } from '@sveltejs/kit';
import { getLapSeries, getSession } from '#lib/server/openf1.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, setHeaders }) => {
	const key = Number(params.session);
	if (!Number.isInteger(key)) error(404, 'No such session');

	const found = await getSession(key).catch(() => {
		error(503, 'Could not reach OpenF1. Try again in a minute.');
	});
	if (!found) error(404, 'No such session');

	const { meeting, session } = found;
	if (Date.parse(session.start) > Date.now())
		error(404, `${meeting.name} ${session.name} hasn't started yet`);

	const series = await getLapSeries(session).catch(() => {
		error(503, 'Could not load the laps from OpenF1. Try again in a minute.');
	});

	const done = Date.parse(session.end) < Date.now() - 2 * 60 * 60 * 1000;
	setHeaders({
		'cache-control': done
			? 'public, max-age=0, s-maxage=86400, stale-while-revalidate=604800'
			: 'public, max-age=0, s-maxage=60'
	});

	return {
		meeting: { key: meeting.key, name: meeting.name, round: meeting.round, flag: meeting.flag },
		session,
		series
	};
};
