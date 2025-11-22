<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
</script>

<div class="error-container">
	<h1>Oops! Something went wrong</h1>
	<p class="error-message">{page.error?.message || 'An unexpected error occurred'}</p>
	<a href={resolve("/")} class="home-link">Go back home</a>
</div>

<style>
	.error-container {
		max-width: 600px;
		margin: 4rem auto;
		padding: 2rem;
		text-align: center;
	}

	h1 {
		color: #dc2626;
		margin-bottom: 1rem;
	}

	.error-message {
		color: #666;
		margin-bottom: 2rem;
		font-size: 1.1rem;
	}

	.home-link {
		display: inline-block;
		padding: 0.75rem 1.5rem;
		background: #3b82f6;
		color: white;
		text-decoration: none;
		border-radius: 4px;
		transition: background 0.2s;
	}

	.home-link:hover {
		background: #2563eb;
	}
</style>
