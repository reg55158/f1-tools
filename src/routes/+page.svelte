<script lang="ts">
	import { useClock } from '#lib/clock.svelte.ts';
	import ResultsTable from '#lib/components/ResultsTable.svelte';
	import SessionList from '#lib/components/SessionList.svelte';
	import TrackMap from '#lib/components/TrackMap.svelte';
	import { formatCountdown, formatDateRange, formatDateTime, shortName } from '#lib/format.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const clock = useClock(() => data.now);

	// The session the big countdown is for: the live one if there is one, else the next to start
	const focus = $derived(data.next?.sessions.find((s) => Date.parse(s.end) > clock.now) ?? null);
	const focusLive = $derived(focus !== null && Date.parse(focus.start) <= clock.now);
</script>

<svelte:head>
	<title>{data.next ? `${data.next.name} countdown · F1 Tools` : 'F1 Tools'}</title>
</svelte:head>

<div class="container grid">
	{#if data.next}
		<section class="card hero">
			<p class="kicker">
				{#if data.next.flag}<img
						class="flag"
						src={data.next.flag}
						alt=""
						width="32"
						height="21"
					/>{/if}
				Round {data.next.round} · {data.next.circuitName} · {formatDateRange(
					data.next.start,
					data.next.end
				)}
			</p>
			<h1><a href="/race/{data.next.key}">{data.next.name}</a></h1>

			{#if focus}
				<div class="countdown" aria-live="off">
					<span class="label">
						{shortName(focus.name)}
						{#if focusLive}<span class="badge live">Live now</span>{:else}starts in{/if}
					</span>
					{#if !focusLive}
						<span class="big mono">{formatCountdown(Date.parse(focus.start) - clock.now)}</span>
					{/if}
					<span class="muted">{formatDateTime(focus.start, clock.local)}</span>
				</div>
			{/if}
		</section>

		<section class="card">
			<h2>Weekend schedule</h2>
			<SessionList
				sessions={data.next.sessions}
				{clock}
				href={(s) => `/race/${s.meetingKey}?session=${s.key}`}
			/>
			{#if !clock.local}
				<p class="muted small">Times show in your time zone once the page has loaded.</p>
			{/if}
		</section>

		<section class="card">
			<h2>{data.next.circuitName}</h2>
			<TrackMap track={data.track} image={data.next.circuitImage} name={data.next.circuitName} />
		</section>
	{:else}
		<section class="card hero">
			<h1>Season over</h1>
			<p class="muted">
				The next calendar isn't published yet.
				{#if data.lastRace}The last race was the <a href="/race/{data.lastRace.key}"
						>{data.lastRace.name}</a
					>.{/if}
			</p>
		</section>
	{/if}

	{#if data.last}
		<section class="card wide">
			<h2>
				Latest results:
				<a href="/race/{data.last.meeting.key}?session={data.last.session.key}">
					{data.last.meeting.name}, {shortName(data.last.session.name)}
				</a>
			</h2>
			{#if data.last.results}
				<ResultsTable results={data.last.results} type={data.last.session.type} />
			{:else}
				<p class="muted">Results couldn't be loaded right now.</p>
			{/if}
			{#if data.last.session.type === 'Race'}
				<p><a class="btn" href="/laps/{data.last.session.key}">Lap chart →</a></p>
			{/if}
		</section>
	{/if}
</div>

<style>
	.grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 20px;
	}

	.hero,
	.wide {
		grid-column: 1 / -1;
	}

	@media (max-width: 760px) {
		.grid {
			grid-template-columns: minmax(0, 1fr);
		}
	}

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
		font-size: clamp(1.8rem, 5vw, 2.8rem);
	}

	h1 a {
		color: inherit;
	}

	.countdown {
		display: flex;
		flex-direction: column;
		gap: 4px;
		padding: 16px 20px;
		border-left: 6px solid var(--gulf-orange);
		background: var(--surface-2);
		border-radius: 0 10px 10px 0;
	}

	.label {
		display: flex;
		align-items: center;
		gap: 8px;
		font-weight: 600;
	}

	.big {
		font-size: clamp(2.2rem, 9vw, 4rem);
		font-weight: 700;
		line-height: 1.1;
		letter-spacing: -0.03em;
	}

	.small {
		font-size: 0.85rem;
		margin-bottom: 0;
	}
</style>
