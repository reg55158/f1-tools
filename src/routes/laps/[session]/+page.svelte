<script lang="ts">
	import { SvelteSet } from 'svelte/reactivity';
	import LapChart from '#lib/components/LapChart.svelte';
	import { formatLapTime } from '#lib/format.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const series = $derived(data.series);
	const laps = $derived(Math.max(0, ...series.map((s) => s.times.length)));

	// Start with the top five finishers; the chips toggle the rest. Starts over on another race.
	const selected = $derived(new SvelteSet<number>(series.slice(0, 5).map((s) => s.driver.number)));
	let hideSlow = $state(true);

	const shown = $derived(series.filter((s) => selected.has(s.driver.number)));

	// Team-mates share a colour, so the second driver of each team (in finishing order) is dashed.
	// Worked out over everyone, not just the shown drivers, so a line never changes style.
	const dashed = $derived.by(() => {
		const seen = new Set<string>();
		const second = new Set<number>();
		for (const s of series) {
			if (seen.has(s.driver.team)) second.add(s.driver.number);
			seen.add(s.driver.team);
		}
		return second;
	});

	const best = (times: (number | null)[]) =>
		Math.min(...times.filter((t): t is number => t !== null));

	function toggle(number: number) {
		if (selected.has(number)) selected.delete(number);
		else selected.add(number);
	}
</script>

<svelte:head>
	<title>{data.meeting.name} {data.session.name} lap chart · f1.reg58.me</title>
</svelte:head>

<div class="container">
	<p class="kicker">
		{#if data.meeting.flag}<img src={data.meeting.flag} alt="" width="32" height="21" />{/if}
		Round {data.meeting.round} ·
		<a href="/race/{data.meeting.key}?session={data.session.key}">Results</a>
	</p>
	<h1>{data.meeting.name} · {data.session.name}</h1>

	{#if series.length === 0}
		<div class="card"><p class="muted">No lap data published for this session yet.</p></div>
	{:else}
		<div class="card controls">
			<div class="chips" role="group" aria-label="Drivers">
				{#each series as s (s.driver.number)}
					<button
						class="chip"
						aria-pressed={selected.has(s.driver.number)}
						onclick={() => toggle(s.driver.number)}
						title={`${s.driver.name}, ${s.driver.team}`}
					>
						<span
							class="key"
							style:border-color={s.driver.colour}
							class:dashed={dashed.has(s.driver.number)}
						></span>
						{s.driver.code}
					</button>
				{/each}
			</div>
			<div class="actions">
				<button class="btn" onclick={() => series.forEach((s) => selected.add(s.driver.number))}
					>All</button
				>
				<button class="btn" onclick={() => selected.clear()}>None</button>
				<label class="toggle">
					<input type="checkbox" bind:checked={hideSlow} />
					Hide slow laps
					<span class="muted">(over 107% of the driver's median: pit stops, safety cars)</span>
				</label>
			</div>
		</div>

		<section class="card">
			<h2>Lap times</h2>
			<LapChart
				series={shown}
				mode="time"
				{laps}
				{dashed}
				{hideSlow}
				label="Lap time per lap for the selected drivers"
			/>
		</section>

		<section class="card">
			<h2>Positions</h2>
			<LapChart
				series={shown}
				mode="position"
				{laps}
				{dashed}
				label="Position after each lap for the selected drivers"
			/>
			<p class="muted small">Hollow rings mark pit stops.</p>
		</section>

		<section class="card">
			<h2>Summary</h2>
			<div class="table-wrap">
				<table>
					<thead>
						<tr>
							<th class="num">Pos</th>
							<th>Driver</th>
							<th class="num">Laps</th>
							<th class="num">Best lap</th>
							<th>Pit stops (lap)</th>
						</tr>
					</thead>
					<tbody>
						{#each series as s, i (s.driver.number)}
							{@const last = s.positions.findLastIndex((p) => p !== null)}
							<tr>
								<td class="num">{i + 1}</td>
								<td>
									<span
										class="key"
										style:border-color={s.driver.colour}
										class:dashed={dashed.has(s.driver.number)}
									></span>
									<strong class="mono">{s.driver.code}</strong>
									<span class="muted">{s.driver.team}</span>
								</td>
								<td class="num">{last + 1}</td>
								<td class="num"
									>{formatLapTime(Number.isFinite(best(s.times)) ? best(s.times) : null)}</td
								>
								<td class="mono">{s.pitLaps.join(', ') || '–'}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</section>
	{/if}
</div>

<style>
	.kicker {
		display: flex;
		align-items: center;
		gap: 10px;
		margin: 0 0 6px;
		color: var(--text-muted);
		font-weight: 500;
	}

	.kicker img {
		border-radius: 3px;
		box-shadow: 0 0 0 1px var(--border);
	}

	h1 {
		font-size: clamp(1.6rem, 5vw, 2.4rem);
	}

	section,
	.controls {
		margin-bottom: 20px;
	}

	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}

	.chip {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 4px 10px;
		border-radius: 999px;
		border: 1px solid var(--border);
		background: var(--surface);
		color: var(--text-muted);
		font: 600 0.85rem var(--mono);
		cursor: pointer;
		opacity: 0.6;
	}

	.chip[aria-pressed='true'] {
		opacity: 1;
		color: var(--navy);
		border-color: var(--navy);
		background: var(--surface-2);
	}

	.key {
		display: inline-block;
		width: 16px;
		border-top: 3px solid;
		vertical-align: middle;
		margin-right: 4px;
	}

	.key.dashed {
		border-top-style: dashed;
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px 12px;
		margin-top: 14px;
	}

	.actions .btn {
		padding: 0.3em 0.9em;
		font-size: 0.88rem;
	}

	.toggle {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0 6px;
		font-weight: 500;
	}

	/* The explanation drops under the label when there's no room beside it */
	.toggle .muted {
		font-weight: 400;
		font-size: 0.85rem;
	}

	.small {
		font-size: 0.85rem;
		margin-bottom: 0;
	}
</style>
