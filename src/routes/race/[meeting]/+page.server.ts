import { error } from '@sveltejs/kit';
import { meetingEnd } from '#lib/format.ts';
import { getMeeting, getResults, getTrack } from '#lib/server/openf1.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, url, setHeaders }) => {
	const key = Number(params.meeting);
	if (!Number.isInteger(key)) error(404, 'No such race weekend');

	const meeting = await getMeeting(key).catch(() => {
		error(503, 'Could not reach OpenF1. Try again in a minute.');
	});
	if (!meeting) error(404, 'No such race weekend');

	const now = Date.now();
	const started = meeting.sessions.filter((s) => Date.parse(s.start) <= now);

	// ?session= picks a tab; by default show the latest session that has started
	const asked = Number(url.searchParams.get('session'));
	const selected =
		meeting.sessions.find((s) => s.key === asked) ?? started.at(-1) ?? meeting.sessions[0] ?? null;
	const hasStarted = selected !== null && Date.parse(selected.start) <= now;

	const [results, track] = await Promise.all([
		selected && hasStarted ? getResults(selected).catch(() => null) : [],
		getTrack(meeting).catch(() => null)
	]);

	const finished = meetingEnd(meeting) < now - 6 * 60 * 60 * 1000; // results settle after a few hours
	setHeaders({
		'cache-control': finished
			? 'public, max-age=0, s-maxage=86400, stale-while-revalidate=604800'
			: 'public, max-age=0, s-maxage=60, stale-while-revalidate=600'
	});

	return { now, meeting, selected, hasStarted, results, track };
};
