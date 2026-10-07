<script lang="ts">
	import { useClock } from '#lib/clock.svelte.ts';
	import ResultsTable from '#lib/components/ResultsTable.svelte';
	import TrackMap from '#lib/components/TrackMap.svelte';
	import {
		formatCountdown,
		formatDateRange,
		formatDateTime,
		sessionStatus,
		shortName
	} from '#lib/format.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const clock = useClock(() => data.now);
	const meeting = $derived(data.meeting);
	const selected = $derived(data.selected);
	const status = $derived(selected ? sessionStatus(selected, clock.now) : null);
</script>

<svelte:head>
	<title>{meeting.name} · F1 Tools</title>
</svelte:head>

<div class="container">
	<p class="kicker">
		{#if meeting.flag}<img class="flag" src={meeting.flag} alt="" width="32" height="21" />{/if}
		Round {meeting.round} · {meeting.location}, {meeting.country} · {formatDateRange(
			meeting.start,
			meeting.end
		)}
	</p>
	<h1>{meeting.name}</h1>
	<p class="muted official">{meeting.officialName}</p>

	<div class="grid">
		<section class="card results">
			<nav class="tabs" aria-label="Sessions">
				{#each meeting.sessions as session (session.key)}
					<a
						href="?session={session.key}"
						data-sveltekit-reset="false"
						data-sveltekit-replacestate
						aria-current={session.key === selected?.key ? 'page' : undefined}
					>
						{shortName(session.name)}
					</a>
				{/each}
			</nav>

			{#if selected}
				<div class="head">
					<h2>{selected.name}</h2>
					{#if status}<span class="badge {status}">{status}</span>{/if}
					<span class="muted">{formatDateTime(selected.start, clock.local)}</span>
				</div>

				{#if !data.hasStarted}
					<p>
						Starts in <strong class="mono"
							>{formatCountdown(Date.parse(selected.start) - clock.now)}</strong
						>.
					</p>
				{:else if data.results}
					<ResultsTable results={data.results} type={selected.type} />
					{#if selected.type === 'Race' && status === 'done'}
						<p><a class="btn" href="/laps/{selected.key}">Lap chart →</a></p>
					{/if}
				{:else}
					<p class="muted">Results couldn't be loaded right now.</p>
				{/if}
			{:else}
				<p class="muted">No sessions published for this weekend yet.</p>
			{/if}
		</section>

		<section class="card">
			<h2>{meeting.circuitName}</h2>
			<TrackMap track={data.track} image={meeting.circuitImage} name={meeting.circuitName} />
		</section>
	</div>
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

	.flag {
		border-radius: 3px;
		box-shadow: 0 0 0 1px var(--border);
	}

	h1 {
		font-size: clamp(1.8rem, 5vw, 2.6rem);
		margin-bottom: 0.15em;
	}

	.official {
		margin-top: 0;
	}

	.grid {
		display: grid;
		grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr);
		gap: 20px;
		align-items: start;
	}

	@media (max-width: 860px) {
		.grid {
			grid-template-columns: minmax(0, 1fr);
		}
	}

	.tabs {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		margin-bottom: 16px;
	}

	.tabs a {
		padding: 5px 12px;
		border-radius: 999px;
		border: 1px solid var(--border);
		font-weight: 600;
		font-size: 0.9rem;
	}

	.tabs a:hover {
		text-decoration: none;
		border-color: var(--navy);
	}

	.tabs a[aria-current='page'] {
		background: var(--navy);
		border-color: var(--navy);
		color: var(--gulf-orange);
	}

	.head {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 10px;
		margin-bottom: 8px;
	}

	.head h2 {
		margin: 0;
	}
</style>
