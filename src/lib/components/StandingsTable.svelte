<!--
	Drivers' or constructors' championship table. Long tables show the top `limit` rows and fold the
	rest into a "Show all" disclosure (works without JavaScript).
-->
<script lang="ts">
	import type { DriverStanding, TeamStanding } from '#lib/types.ts';

	type Row = {
		key: string;
		position: number;
		colour: string;
		code?: string;
		name: string;
		points: number;
		change: number;
	};

	let {
		drivers,
		teams,
		limit = 10
	}: { drivers?: DriverStanding[]; teams?: TeamStanding[]; limit?: number } = $props();

	const rows = $derived<Row[]>(
		drivers
			? drivers.map((s) => ({
					key: String(s.driver.number),
					position: s.position,
					colour: s.driver.colour,
					code: s.driver.code,
					name: s.driver.name,
					points: s.points,
					change: s.change
				}))
			: (teams ?? []).map((s) => ({
					key: s.team,
					position: s.position,
					colour: s.colour,
					name: s.team,
					points: s.points,
					change: s.change
				}))
	);

	const leader = $derived(rows[0]?.points ?? 0);
	const points = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
</script>

{#snippet table(list: Row[], head: boolean)}
	<table>
		{#if head}
			<thead>
				<tr>
					<th class="num">Pos</th>
					<th>{drivers ? 'Driver' : 'Team'}</th>
					<th class="num">Pts</th>
					<th class="num gap">Gap</th>
				</tr>
			</thead>
		{/if}
		<tbody>
			{#each list as row (row.key)}
				<tr>
					<td class="num pos">
						{row.position}
						<!-- always present, so the numbers line up whether or not there's an arrow -->
						<span class="move" class:up={row.change > 0} class:down={row.change < 0}>
							{#if row.change !== 0}
								<span aria-hidden="true">{row.change > 0 ? '▲' : '▼'}</span><span
									class="visually-hidden">{row.change > 0 ? 'up' : 'down'}</span
								>
								{Math.abs(row.change)}
							{/if}
						</span>
					</td>
					<td>
						<span class="who">
							<span class="swatch" style:background={row.colour}></span>
							{#if row.code}
								<strong class="mono">{row.code}</strong>
								<span class="name">{row.name}</span>
							{:else}
								<strong>{row.name}</strong>
							{/if}
						</span>
					</td>
					<td class="num"><strong>{points(row.points)}</strong></td>
					<td class="num gap muted"
						>{row.points < leader ? `−${points(leader - row.points)}` : ''}</td
					>
				</tr>
			{/each}
		</tbody>
	</table>
{/snippet}

{#if rows.length === 0}
	<p class="muted">No standings yet.</p>
{:else}
	<div class="table-wrap">
		{@render table(rows.slice(0, limit), true)}
	</div>
	{#if rows.length > limit}
		<details>
			<summary>Show all {rows.length}</summary>
			<div class="table-wrap">{@render table(rows.slice(limit), false)}</div>
		</details>
	{/if}
{/if}

<style>
	/* Both halves of a folded table line up as one */
	table {
		table-layout: fixed;
	}

	:is(th, td):nth-child(1) {
		width: 4.2rem; /* rem, not em: header and body cells use different font sizes */
	}

	:is(th, td):nth-child(3) {
		width: 3.9rem;
	}

	:is(th, td):nth-child(4) {
		width: 4.5rem;
	}

	/* Only names get cut short when space runs out; numbers never do */
	td:nth-child(2) {
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.pos {
		white-space: nowrap;
	}

	.move {
		display: inline-block;
		width: 2.2em;
		white-space: nowrap;
		font-size: 0.7rem;
		text-align: left;
	}

	.up {
		color: var(--success);
	}

	.down {
		color: var(--danger);
	}

	.who {
		display: inline-flex;
		align-items: center;
		gap: 8px;
	}

	.swatch {
		flex: none;
		width: 4px;
		height: 1.2em;
		border-radius: 2px;
	}

	details {
		margin-top: 2px;
	}

	details > .table-wrap tbody tr:first-child td {
		border-top: 1px solid var(--border);
	}

	summary {
		cursor: pointer;
		padding: 8px;
		font-weight: 600;
		font-size: 0.9rem;
		color: var(--text-muted);
	}

	@media (max-width: 480px) {
		.name,
		.gap {
			display: none;
		}
	}
</style>
