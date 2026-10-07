<!--
	Circuit outline: a thick navy track with an orange racing line down the middle, corner numbers,
	and a chequered start/finish marker. Falls back to OpenF1's circuit image, then to nothing.
-->
<script lang="ts">
	import type { Track } from '#lib/types.ts';

	let {
		track,
		image = null,
		name
	}: { track: Track | null; image?: string | null; name: string } = $props();
</script>

{#if track}
	<svg class="map" viewBox={track.viewBox} role="img" aria-label="Track map of {name}">
		<path class="edge" d={track.path} />
		<path class="line" d={track.path} />
		{#if track.start}
			<g transform="translate({track.start.x} {track.start.y})">
				<rect
					x="-14"
					y="-14"
					width="28"
					height="28"
					rx="4"
					fill="var(--surface)"
					stroke="var(--navy)"
					stroke-width="4"
				/>
				<rect x="-9" y="-9" width="9" height="9" fill="var(--navy)" />
				<rect x="0" y="0" width="9" height="9" fill="var(--navy)" />
			</g>
		{/if}
		{#each track.corners as corner}
			<g class="corner" transform="translate({corner.x} {corner.y})">
				<circle r="19" />
				<text dy="0.35em">{corner.number}</text>
			</g>
		{/each}
	</svg>
{:else if image}
	<img class="map" src={image} alt="Track map of {name}" loading="lazy" />
{:else}
	<p class="muted">No track map for {name} yet. It appears after the first session.</p>
{/if}

<style>
	.map {
		display: block;
		width: 100%;
		height: auto;
		max-height: 420px;
	}

	.edge,
	.line {
		fill: none;
		stroke-linejoin: round;
		stroke-linecap: round;
	}

	.edge {
		stroke: var(--navy);
		stroke-width: 22;
	}

	.line {
		stroke: var(--gulf-orange);
		stroke-width: 7;
	}

	.corner circle {
		fill: var(--surface);
		stroke: var(--navy);
		stroke-width: 3;
	}

	.corner text {
		font: 700 20px var(--mono);
		text-anchor: middle;
		fill: var(--navy);
	}
</style>
