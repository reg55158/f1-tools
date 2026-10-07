<!--
	Line chart of lap times or positions, one line per driver in their team colour. Team-mates share
	a colour, so the second driver of each team is dashed (see `dashed`). Hovering shows every
	driver's value for that lap. Pit stops are marked with a hollow ring.
-->
<script lang="ts">
	import { formatLapTime } from '#lib/format.ts';
	import type { LapSeries } from '#lib/types.ts';

	let {
		series,
		mode,
		laps,
		dashed,
		hideSlow = false,
		label
	}: {
		series: LapSeries[];
		mode: 'time' | 'position';
		laps: number;
		dashed: Set<number>;
		hideSlow?: boolean;
		label: string;
	} = $props();

	const HEIGHT = 340;
	const M = { top: 12, right: 14, bottom: 30, left: 62 };

	let width = $state(800);
	let hoverLap = $state<number | null>(null);

	/** Values to plot per driver: lap times (slow laps optionally dropped) or positions */
	const lines = $derived(
		series.map((s) => {
			if (mode === 'position') return { s, values: s.positions };
			if (!hideSlow) return { s, values: s.times };
			// "Slow" = over 107% of this driver's median lap: pit stops, safety cars, the first lap
			const sorted = s.times.filter((t): t is number => t !== null).sort((a, b) => a - b);
			const median = sorted[Math.floor(sorted.length / 2)] ?? Infinity;
			return { s, values: s.times.map((t) => (t !== null && t <= median * 1.07 ? t : null)) };
		})
	);

	const domain = $derived.by((): [number, number] => {
		if (mode === 'position')
			return [1, Math.max(series.length, ...lines.flatMap((l) => l.values.map((v) => v ?? 0)))];
		const all = lines.flatMap((l) => l.values).filter((v): v is number => v !== null);
		if (all.length === 0) return [60, 120];
		const min = Math.min(...all);
		const max = Math.max(...all);
		const pad = Math.max(0.3, (max - min) * 0.05);
		return [min - pad, max + pad];
	});

	const plotW = $derived(Math.max(100, width - M.left - M.right));
	const plotH = HEIGHT - M.top - M.bottom;

	const x = (lap: number) => M.left + ((lap - 1) / Math.max(1, laps - 1)) * plotW;
	// Positions: P1 at the top. Times: faster laps at the top too, so "up" always means "better".
	const y = (v: number) =>
		M.top + ((v - domain[0]) / Math.max(1e-9, domain[1] - domain[0])) * plotH;

	function path(values: (number | null)[]): string {
		let d = '';
		let pen = false;
		values.forEach((v, i) => {
			if (v === null) return void (pen = false);
			d += `${pen ? 'L' : 'M'}${x(i + 1).toFixed(1)} ${y(v).toFixed(1)}`;
			pen = true;
		});
		return d;
	}

	/** Round numbers for the y-axis */
	const yTicks = $derived.by(() => {
		const [lo, hi] = domain;
		if (mode === 'position') {
			const step = hi > 12 ? 5 : 2;
			const ticks = [1];
			for (let p = step; p <= hi; p += step) ticks.push(p);
			return ticks;
		}
		const span = hi - lo;
		const step = [0.2, 0.5, 1, 2, 5, 10, 15, 30, 60].find((s) => span / s <= 6) ?? 120;
		const ticks = [];
		for (let t = Math.ceil(lo / step) * step; t <= hi; t += step) ticks.push(t);
		return ticks;
	});

	const xTicks = $derived.by(() => {
		const step = [1, 2, 5, 10, 20].find((s) => laps / s <= Math.max(4, plotW / 70)) ?? 25;
		const ticks = [1];
		for (let l = step; l <= laps; l += step) if (l > 1) ticks.push(l);
		return ticks;
	});

	function onPointer(event: PointerEvent) {
		const svg = event.currentTarget as SVGSVGElement;
		const px = ((event.clientX - svg.getBoundingClientRect().left) / svg.clientWidth) * width;
		const lap = Math.round(((px - M.left) / plotW) * (laps - 1)) + 1;
		hoverLap = lap >= 1 && lap <= laps ? lap : null;
	}

	/** Everyone's value on the hovered lap, best first */
	const hoverRows = $derived(
		hoverLap === null
			? []
			: lines
					.map((l) => ({
						s: l.s,
						value: l.s[mode === 'time' ? 'times' : 'positions'][hoverLap! - 1],
						pit: l.s.pitLaps.includes(hoverLap!)
					}))
					.filter((r) => r.value !== null)
					.sort((a, b) => a.value! - b.value!)
	);

	const format = (v: number) => (mode === 'time' ? formatLapTime(v) : `P${v}`);

	/** "1:32" on whole seconds, "1:32.5" between them; "P5" for positions */
	function tickLabel(t: number): string {
		if (mode === 'position') return `P${t}`;
		const total = Math.round(t * 10); // in tenths, so 119.9999 doesn't print as "1:60"
		const m = Math.floor(total / 600);
		const tenths = total - m * 600;
		const seconds =
			tenths % 10 === 0
				? String(tenths / 10).padStart(2, '0')
				: (tenths / 10).toFixed(1).padStart(4, '0');
		return `${m}:${seconds}`;
	}
</script>

<div class="chart" bind:clientWidth={width}>
	<svg
		viewBox="0 0 {width} {HEIGHT}"
		role="img"
		aria-label={label}
		onpointermove={onPointer}
		onpointerleave={() => (hoverLap = null)}
	>
		<!-- recessive grid -->
		{#each yTicks as t}
			<line class="grid" x1={M.left} x2={width - M.right} y1={y(t)} y2={y(t)} />
			<text class="tick" x={M.left - 8} y={y(t)} dy="0.32em" text-anchor="end">
				{tickLabel(t)}
			</text>
		{/each}
		{#each xTicks as l}
			<text class="tick" x={x(l)} y={HEIGHT - 8} text-anchor="middle">{l}</text>
		{/each}
		<text class="tick" x={M.left - 8} y={HEIGHT - 8} text-anchor="end">Lap</text>

		{#if hoverLap !== null}
			<line class="crosshair" x1={x(hoverLap)} x2={x(hoverLap)} y1={M.top} y2={HEIGHT - M.bottom} />
		{/if}

		{#each lines as { s, values } (s.driver.number)}
			<path
				class="line"
				d={path(values)}
				stroke={s.driver.colour}
				stroke-dasharray={dashed.has(s.driver.number) ? '6 4' : undefined}
			/>
			{#each s.pitLaps as lap}
				{@const v = values[lap - 1]}
				{#if v !== null && v !== undefined}
					<circle class="pit" cx={x(lap)} cy={y(v)} r="4" stroke={s.driver.colour} />
				{/if}
			{/each}
		{/each}

		{#if hoverLap !== null}
			{#each hoverRows as r (r.s.driver.number)}
				{@const v = lines.find((l) => l.s === r.s)?.values[hoverLap - 1]}
				{#if v !== null && v !== undefined}
					<circle class="dot" cx={x(hoverLap)} cy={y(v)} r="4" fill={r.s.driver.colour} />
				{/if}
			{/each}
		{/if}
	</svg>

	{#if hoverLap !== null && hoverRows.length}
		<div
			class="tooltip"
			style:left="{x(hoverLap)}px"
			class:flip={x(hoverLap) > width / 2}
			role="status"
		>
			<strong>Lap {hoverLap}</strong>
			<ul>
				{#each hoverRows as r (r.s.driver.number)}
					<li>
						<span
							class="key"
							style:border-color={r.s.driver.colour}
							class:dashed={dashed.has(r.s.driver.number)}
						></span>
						<span class="mono">{r.s.driver.code}</span>
						<span class="mono value">{format(r.value!)}</span>
						{#if r.pit}<span class="tag">pit</span>{/if}
					</li>
				{/each}
			</ul>
		</div>
	{/if}
</div>

<style>
	.chart {
		position: relative;
		width: 100%;
	}

	svg {
		display: block;
		width: 100%;
		height: auto;
		touch-action: pan-y;
	}

	.grid {
		stroke: var(--border);
		stroke-width: 1;
	}

	.tick {
		font: 12px var(--mono);
		fill: var(--text-muted);
	}

	.crosshair {
		stroke: var(--navy);
		stroke-width: 1;
		stroke-dasharray: 3 3;
	}

	.line {
		fill: none;
		stroke-width: 2;
		stroke-linejoin: round;
		stroke-linecap: round;
	}

	.pit {
		fill: var(--surface);
		stroke-width: 2;
	}

	/* 2px surface ring so overlapping dots stay distinct */
	.dot {
		stroke: var(--surface);
		stroke-width: 2;
	}

	.tooltip {
		position: absolute;
		top: 8px;
		transform: translateX(12px);
		pointer-events: none;
		background: var(--surface);
		border: 1px solid var(--navy);
		border-radius: 10px;
		box-shadow: var(--shadow);
		padding: 8px 10px;
		font-size: 0.82rem;
		max-height: 300px;
		overflow: hidden;
		z-index: 2;
	}

	.tooltip.flip {
		transform: translateX(calc(-100% - 12px));
	}

	.tooltip ul {
		list-style: none;
		margin: 4px 0 0;
		padding: 0;
	}

	.tooltip li {
		display: flex;
		align-items: center;
		gap: 6px;
		line-height: 1.5;
	}

	.value {
		margin-left: auto;
		padding-left: 8px;
	}

	.key {
		width: 16px;
		border-top: 3px solid;
	}

	.key.dashed {
		border-top-style: dashed;
	}
</style>
