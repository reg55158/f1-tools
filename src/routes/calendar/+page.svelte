<script lang="ts">
	import { useClock } from '#lib/clock.svelte.ts';
	import { formatDateRange, meetingEnd } from '#lib/format.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const clock = useClock(() => data.now);
	const nextKey = $derived(data.season.find((m) => meetingEnd(m) > clock.now)?.key);
	const hasSprint = (sessions: { name: string }[]) => sessions.some((s) => s.name === 'Sprint');
</script>

<svelte:head>
	<title>{data.year} calendar · f1.reg58.me</title>
</svelte:head>

<div class="container">
	<h1>{data.year} calendar</h1>

	<ol class="meetings">
		{#each data.season as meeting (meeting.key)}
			{@const past = meetingEnd(meeting) <= clock.now}
			<li class:past class:next={meeting.key === nextKey}>
				<a class="card row" href="/race/{meeting.key}">
					<span class="round mono">R{meeting.round}</span>
					{#if meeting.flag}
						<img class="flag" src={meeting.flag} alt="" width="36" height="24" loading="lazy" />
					{:else}
						<span class="flag"></span>
					{/if}
					<span class="title">
						<strong>{meeting.name}</strong>
						<span class="muted">{meeting.circuitName}, {meeting.country}</span>
					</span>
					<span class="meta">
						{#if meeting.key === nextKey}<span class="badge upcoming">Next</span>{/if}
						{#if hasSprint(meeting.sessions)}<span class="tag">Sprint</span>{/if}
						<span class="dates">{formatDateRange(meeting.start, meeting.end)}</span>
					</span>
				</a>
			</li>
		{/each}
	</ol>
</div>

<style>
	.meetings {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 10px;
	}

	.row {
		display: flex;
		align-items: center;
		gap: 14px;
		padding: 12px 16px;
		color: inherit;
		transition: border-color 0.15s;
	}

	.row:hover {
		text-decoration: none;
		border-color: var(--navy);
	}

	.past .row {
		opacity: 0.6;
	}

	.next .row {
		border: 2px solid var(--gulf-orange);
		box-shadow:
			0 0 0 3px var(--navy),
			var(--shadow);
	}

	.round {
		width: 2.6em;
		font-weight: 700;
		color: var(--text-muted);
	}

	.flag {
		width: 36px;
		height: 24px;
		flex: none;
		border-radius: 3px;
		box-shadow: 0 0 0 1px var(--border);
	}

	.title {
		display: flex;
		flex-direction: column;
		flex: 1;
		min-width: 0;
		line-height: 1.3;
	}

	.title .muted {
		font-size: 0.88rem;
	}

	.meta {
		display: flex;
		align-items: center;
		gap: 8px;
		white-space: nowrap;
	}

	.dates {
		font-weight: 600;
		min-width: 6.5em;
		text-align: right;
	}

	@media (max-width: 560px) {
		.row {
			flex-wrap: wrap;
		}
		.meta {
			width: 100%;
			padding-left: calc(2.6em + 50px);
		}
		.dates {
			text-align: left;
		}
	}
</style>
