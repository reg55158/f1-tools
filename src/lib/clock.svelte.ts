import { onMount, untrack } from 'svelte';

/**
 * A ticking clock for countdowns. It starts at the time the server rendered the page, so the
 * first render in the browser matches the HTML exactly (no hydration mismatch). Once mounted it
 * switches to the real time and the viewer's time zone, and ticks every second.
 *
 * Call it during component setup.
 */
export function useClock(serverNow: () => number) {
	const clock = $state({ now: untrack(serverNow), local: false });

	onMount(() => {
		clock.now = Date.now();
		clock.local = true;
		const id = setInterval(() => (clock.now = Date.now()), 1000);
		return () => clearInterval(id);
	});

	return clock;
}

export type Clock = ReturnType<typeof useClock>;
