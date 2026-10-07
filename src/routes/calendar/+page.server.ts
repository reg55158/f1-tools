import { error } from '@sveltejs/kit';
import { getSeason } from '#lib/server/openf1.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ setHeaders }) => {
	const now = Date.now();
	const year = new Date(now).getUTCFullYear();
	const season = await getSeason(year).catch(() => {
		error(503, 'Could not reach OpenF1 for the calendar. Try again in a minute.');
	});

	setHeaders({ 'cache-control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400' });
	return { now, year, season };
};
