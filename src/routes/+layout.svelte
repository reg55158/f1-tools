<script lang="ts">
	import '../app.css';
	import favicon from '#lib/assets/favicon.svg';
	import RaceScrollbar from '#lib/components/RaceScrollbar.svelte';
	import SiteSwitch from '#lib/components/SiteSwitch.svelte';
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/state';

	let { children } = $props();

	// Phones: the links live in a drop-down behind the burger button (same as reg58.me)
	let menuOpen = $state(false);
	let header: HTMLElement;
	afterNavigate(() => (menuOpen = false));

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

<svelte:window
	onkeydown={(e) => e.key === 'Escape' && (menuOpen = false)}
	onclick={(e) => menuOpen && !header.contains(e.target as Node) && (menuOpen = false)}
/>

<RaceScrollbar />

<header data-site-header bind:this={header}>
	<div class="container bar">
		<a class="logo" href="/">
			<img src={favicon} alt="" width="34" height="34" />
			<span class="name">F1 Tools</span>
		</a>
		<nav id="site-nav" class:open={menuOpen}>
			{#each nav as item}
				<a href={item.href} aria-current={current(item.href) ? 'page' : undefined}>{item.label}</a>
			{/each}
			<SiteSwitch current="f1" />
		</nav>
		<button
			class="burger"
			aria-label="Menu"
			aria-controls="site-nav"
			aria-expanded={menuOpen}
			onclick={() => (menuOpen = !menuOpen)}
		>
			<span></span>
			<span></span>
			<span></span>
		</button>
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

	.burger {
		display: none;
	}

	/*
	 * Phones: one row with the logo and a burger button. The links drop down below the bar,
	 * full width, with the site switch at the bottom. Same as reg58.me.
	 */
	@media (max-width: 640px) {
		.burger {
			display: flex;
			flex-direction: column;
			justify-content: center;
			gap: 5px;
			width: 40px;
			height: 40px;
			padding: 0 9px;
			border: 0;
			border-radius: 8px;
			background: none;
			cursor: pointer;
		}

		.burger:hover,
		.burger[aria-expanded='true'] {
			background: rgb(11 23 34 / 0.12);
		}

		.burger span {
			display: block;
			height: 3px;
			border-radius: 2px;
			background: var(--navy);
			transition:
				transform 0.2s,
				opacity 0.2s;
		}

		/* The three bars fold into an X while the menu is open */
		.burger[aria-expanded='true'] span:nth-child(1) {
			transform: translateY(8px) rotate(45deg);
		}
		.burger[aria-expanded='true'] span:nth-child(2) {
			opacity: 0;
		}
		.burger[aria-expanded='true'] span:nth-child(3) {
			transform: translateY(-8px) rotate(-45deg);
		}

		nav {
			display: none;
			position: absolute;
			top: 100%;
			left: 0;
			right: 0;
			/* Sit under the header's navy stripe */
			margin-top: 4px;
			flex-direction: column;
			align-items: stretch;
			gap: 2px;
			padding: 8px 16px 12px;
			background: var(--gulf-orange);
			border-bottom: 4px solid var(--navy);
			box-shadow: var(--shadow);
		}

		nav.open {
			display: flex;
		}

		nav a {
			padding: 10px 12px;
			font-size: 1rem;
		}

		/* The site switch sits at the bottom of the menu */
		nav :global(.switch) {
			align-self: flex-start;
			margin: 10px 0 0 12px;
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
