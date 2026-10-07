<script lang="ts">
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>Lap charts · F1 Tools</title>
</svelte:head>

<div class="container">
	<h1>Lap charts</h1>
	<p class="muted">Lap times and positions for every {data.year} race and sprint so far.</p>

	{#if data.races.length === 0}
		<div class="card"><p class="muted">No races finished yet.</p></div>
	{:else}
		<ol class="list">
			{#each data.races as race, i (race.key)}
				<li>
					<a class="card row" class:latest={i === 0} href="/laps/{race.key}">
						<span class="mono round">R{race.meeting.round}</span>
						{#if race.meeting.flag}
							<img src={race.meeting.flag} alt="" width="36" height="24" loading="lazy" />
						{/if}
						<strong>{race.meeting.name}</strong>
						{#if race.name === 'Sprint'}<span class="tag">Sprint</span>{/if}
						{#if i === 0}<span class="badge upcoming">Latest</span>{/if}
						<span class="go">→</span>
					</a>
				</li>
			{/each}
		</ol>
	{/if}
</div>

<style>
	.list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 10px;
	}

	.row {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 12px 16px;
		color: inherit;
	}

	.row:hover {
		text-decoration: none;
		border-color: var(--navy);
	}

	.latest {
		border: 2px solid var(--gulf-orange);
	}

	.round {
		width: 2.6em;
		font-weight: 700;
		color: var(--text-muted);
	}

	img {
		border-radius: 3px;
		box-shadow: 0 0 0 1px var(--border);
	}

	.go {
		margin-left: auto;
		font-weight: 700;
	}
</style>
