<script lang="ts">
	import { formatGap, formatLapTime } from '#lib/format.ts';
	import type { Result, Session } from '#lib/types.ts';

	let { results, type }: { results: Result[]; type: Session['type'] } = $props();

	const isQuali = $derived(type === 'Qualifying');
	const isRace = $derived(type === 'Race');

	// Qualifying stores [Q1, Q2, Q3]; show all three
	const parts = (value: Result['time']) => (Array.isArray(value) ? value : [value, null, null]);

	const timeOrStatus = (r: Result, leader: Result | undefined) => {
		if (r.status !== 'ok') return r.status.toUpperCase();
		if (!isRace || r === leader) return formatLapTime(r.time as number | null);
		return formatGap(r.gap as number | string | null) || formatLapTime(r.time as number | null);
	};
</script>

{#if results.length === 0}
	<p class="muted">No results published yet.</p>
{:else}
	<div class="table-wrap">
		<table>
			<thead>
				<tr>
					<th class="num">Pos</th>
					<th>Driver</th>
					<th class="team">Team</th>
					{#if isQuali}
						<th class="num">Q1</th>
						<th class="num">Q2</th>
						<th class="num">Q3</th>
					{:else}
						<th class="num">{isRace ? 'Time / gap' : 'Best lap'}</th>
						{#if !isRace}<th class="num">Gap</th>{/if}
					{/if}
					<th class="num">Laps</th>
					{#if isRace}<th class="num">Pts</th>{/if}
				</tr>
			</thead>
			<tbody>
				{#each results as r (r.driver.number)}
					<tr class:out={r.status !== 'ok'}>
						<td class="num">{r.position ?? '–'}</td>
						<td>
							<span class="driver">
								<span class="swatch" style:background={r.driver.colour}></span>
								<strong class="mono">{r.driver.code}</strong>
								<span class="name">{r.driver.name}</span>
							</span>
						</td>
						<td class="team muted">{r.driver.team}</td>
						{#if isQuali}
							{#each parts(r.time) as q}
								<td class="num">{q === null ? '' : formatLapTime(q)}</td>
							{/each}
						{:else}
							<td class="num">{timeOrStatus(r, results[0])}</td>
							{#if !isRace}
								<td class="num muted">{formatGap(r.gap as number | string | null)}</td>
							{/if}
						{/if}
						<td class="num">{r.laps}</td>
						{#if isRace}<td class="num">{r.points || ''}</td>{/if}
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}

<style>
	.driver {
		display: inline-flex;
		align-items: center;
		gap: 8px;
	}

	.swatch {
		width: 4px;
		height: 1.2em;
		border-radius: 2px;
	}

	.out td {
		color: var(--text-muted);
	}

	@media (max-width: 640px) {
		.name,
		.team {
			display: none;
		}
	}
</style>
