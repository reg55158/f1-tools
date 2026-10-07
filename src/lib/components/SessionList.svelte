<!-- The weekend's sessions in the viewer's local time, each with its state or a countdown. -->
<script lang="ts">
	import type { Clock } from '#lib/clock.svelte.ts';
	import { formatCountdown, formatDateTime, sessionStatus, shortName } from '#lib/format.ts';
	import type { Session } from '#lib/types.ts';

	let {
		sessions,
		clock,
		href
	}: { sessions: Session[]; clock: Clock; href?: (s: Session) => string } = $props();
</script>

<ol class="sessions">
	{#each sessions as session (session.key)}
		{@const status = sessionStatus(session, clock.now)}
		<li class={status}>
			<span class="name">
				{#if href && status !== 'upcoming'}
					<a href={href(session)}>{shortName(session.name)}</a>
				{:else}
					{shortName(session.name)}
				{/if}
			</span>
			<span class="when muted">{formatDateTime(session.start, clock.local)}</span>
			<span class="state">
				{#if status === 'upcoming'}
					<span class="mono">{formatCountdown(Date.parse(session.start) - clock.now)}</span>
				{:else}
					<span class="badge {status}">{status === 'live' ? 'Live' : 'Done'}</span>
				{/if}
			</span>
		</li>
	{/each}
</ol>

<style>
	.sessions {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	li {
		display: grid;
		grid-template-columns: minmax(6.5em, 1fr) auto minmax(7.5em, auto);
		gap: 4px 16px;
		align-items: center;
		padding: 10px 0;
	}

	li + li {
		border-top: 1px solid var(--border);
	}

	.name {
		font-weight: 600;
	}

	.state {
		text-align: right;
	}

	.done .name,
	.done .when {
		opacity: 0.7;
	}

	@media (max-width: 480px) {
		li {
			grid-template-columns: 1fr auto;
		}
		.when {
			grid-row: 2;
			font-size: 0.85rem;
		}
	}
</style>
