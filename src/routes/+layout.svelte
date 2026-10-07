<script lang="ts">
	import '../app.css';
	import favicon from '#lib/assets/favicon.svg';
	import { page } from '$app/state';

	let { children } = $props();

	const nav = [
		{ href: '/', label: 'Next race' },
		{ href: '/calendar', label: 'Calendar' },
		{ href: '/laps', label: 'Lap charts' }
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

<header data-site-header>
	<div class="container bar">
		<a class="logo" href="/">
			<img src={favicon} alt="" width="34" height="34" />
			<span>f1<span class="dim">.reg58.me</span></span>
		</a>
		<nav>
			{#each nav as item}
				<a href={item.href} aria-current={current(item.href) ? 'page' : undefined}>{item.label}</a>
			{/each}
		</nav>
	</div>
</header>

<main>
	{@render children()}
</main>

<footer>
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

	/* On phones, keep just the "f1" so the three links fit */
	@media (max-width: 520px) {
		.dim {
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
