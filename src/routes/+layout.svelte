<script lang="ts">
	import '../app.css';
	import favicon from '#lib/assets/favicon.svg';
	import RaceScrollbar from '#lib/components/RaceScrollbar.svelte';
	import SiteSwitch from '#lib/components/SiteSwitch.svelte';
	import { page } from '$app/state';

	let { children } = $props();

	const nav = [
		{ href: '/', label: 'Next race', short: 'Next' },
		{ href: '/calendar', label: 'Calendar', short: 'Calendar' },
		{ href: '/laps', label: 'Lap charts', short: 'Laps' }
	];

	const current = (href: string) =>
		href === '/' ? page.url.pathname === '/' : page.url.pathname.startsWith(href);
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<meta
		name="description"
		content="F1 session countdowns, results, track maps and lap charts, in Gulf livery."
	/>
</svelte:head>

<RaceScrollbar />

<header data-site-header>
	<div class="container bar">
		<a class="logo" href="/">
			<img src={favicon} alt="" width="34" height="34" />
			<span class="name">F1 Tools</span>
		</a>
		<nav>
			{#each nav as item}
				<a href={item.href} aria-current={current(item.href) ? 'page' : undefined}>
					<span class="long">{item.label}</span><span class="short" aria-hidden="true"
						>{item.short}</span
					>
				</a>
			{/each}
			<SiteSwitch current="f1" />
		</nav>
	</div>
</header>

<main>
	{@render children()}
</main>

<footer data-site-footer>
	<div class="container foot">
		<span>
			Data from <a href="https://openf1.org" rel="noopener">OpenF1</a>, track maps from
			<a href="https://multiviewer.app" rel="noopener">MultiViewer</a>. Unofficial; not associated
			with Formula 1.
		</span>
		<a href="https://reg58.me">← reg58.me</a>
	</div>
</footer>

<style>
	:global(body) {
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
	}

	main {
		flex: 1;
		padding-top: 32px;
	}

	/* Gulf orange bar with a navy livery stripe along the bottom */
	header {
		position: sticky;
		top: 0;
		z-index: 10;
		background: var(--gulf-orange);
		border-bottom: 4px solid var(--navy);
	}

	.bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		min-height: 60px;
		gap: 12px;
	}

	.logo {
		display: flex;
		align-items: center;
		gap: 10px;
		font-family: var(--mono);
		font-weight: 700;
		font-size: 1.1rem;
		color: var(--navy);
	}

	.logo:hover {
		text-decoration: none;
	}

	.logo img {
		display: block;
		border-radius: 8px;
		box-shadow: 0 0 0 1.5px var(--navy);
	}

	nav {
		display: flex;
		align-items: center;
		gap: 4px;
	}

	nav a {
		padding: 6px 10px;
		border-radius: 8px;
		color: var(--navy);
		font-size: 0.95rem;
		font-weight: 500;
		white-space: nowrap;
	}

	nav a:hover {
		background: rgb(11 23 34 / 0.12);
		text-decoration: none;
	}

	/* Current page: navy pill, like a race number board */
	nav a[aria-current='page'] {
		color: var(--gulf-orange);
		background: var(--navy);
	}

	.short {
		display: none;
	}

	/* Narrow phones: shorter link labels (screen readers still get the full ones) */
	@media (max-width: 420px) {
		.long {
			position: absolute;
			width: 1px;
			height: 1px;
			overflow: hidden;
			clip: rect(0 0 0 0);
		}
		.short {
			display: inline;
		}
	}

	/* On phones, keep just the icon so the links and the switch fit */
	@media (max-width: 560px) {
		.logo .name {
			display: none;
		}
		nav a {
			padding: 6px 7px;
			font-size: 0.88rem;
		}
	}

	footer {
		margin-top: 64px;
		background: var(--gulf-orange);
		border-top: 4px solid var(--navy);
		color: var(--navy);
	}

	footer a {
		color: var(--navy);
		font-weight: 600;
	}

	.foot {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: 12px;
		padding-top: 24px;
		padding-bottom: 24px;
		font-size: 0.9rem;
	}
</style>
