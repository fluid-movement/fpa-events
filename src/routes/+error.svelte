<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
</script>

<Card.Root>
	<Card.Header>
		<h1>Oops! Something went wrong</h1>
	</Card.Header>
	<Card.Content>
		<p class="error-message">{page.error?.message || 'An unexpected error occurred'}</p>
	</Card.Content>
	<Card.Footer>
		<Button href={resolve('/')}>Home</Button>
	</Card.Footer>
</Card.Root>
