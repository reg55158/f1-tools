<script lang="ts">
	import { page } from '$app/state';
</script>

<svelte:head>
	<title>{page.status} · f1.reg58.me</title>
</svelte:head>

<div class="container">
	<div class="card">
		<h1>{page.status === 404 ? 'Not found' : 'Red flag'}</h1>
		<p class="muted">{page.error?.message}</p>
		<a class="btn primary" href="/">Back to the next race</a>
	</div>
</div>
