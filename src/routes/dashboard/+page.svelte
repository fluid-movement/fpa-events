<script>
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { client } from '$lib/auth-client';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';

	const session = client.useSession();

	console.log($session.data?.user.email);
	if (!session) {
		goto(resolve('/sign-in'));
	}
</script>

<Card.Root class="w-[350px]">
	<Card.Header>
		<Card.Title>User</Card.Title>
		<Card.Description>Welcome to the dashboard</Card.Description>
	</Card.Header>
	<Card.Content>
		<div class="flex items-center gap-2">
			<div class="">
				<h3 class="text-sm">
					{$session.data?.user.name}
				</h3>
				<p class="text-xs text-muted-foreground">
					{$session.data?.user.email}
				</p>
			</div>
		</div>
	</Card.Content>
	<Card.Footer>
		<Button
			variant="outline"
			onclick={() => {
				client.signOut({
					fetchOptions: {
						onSuccess: () => goto(resolve('/'))
					}
				});
			}}>Sign Out</Button
		>
	</Card.Footer>
</Card.Root>
