<script lang="ts">
	import { Button } from './ui/button';
	import { client } from '$lib/auth-client';
	
	const session = client.useSession();
</script>
