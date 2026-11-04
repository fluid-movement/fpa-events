<script lang="ts">
	import { CREW_LINK_KINDS, CREW_LINK_LABELS, type CrewLinkKind } from '#lib/crew-links';
	import { Button } from '#lib/components/ui/button';
	import Section from '#lib/components/layout/Section.svelte';
	import SocialIcon from '#lib/components/SocialIcon.svelte';
	let { links }: { links: { kind: string; url: string }[] } = $props();
	const orderedLinks = $derived(
		[...links].sort((a, b) => {
			const order = (kind: string) => {
				const index = CREW_LINK_KINDS.indexOf(kind as CrewLinkKind);
				return index < 0 ? CREW_LINK_KINDS.length : index;
			};
			return order(a.kind) - order(b.kind);
		})
	);
</script>

{#if orderedLinks.length}
	<Section title="Contact links">
		<div class="flex flex-wrap gap-2" data-testid="crew-contact-links">
			{#each orderedLinks as link (link.kind)}
				<Button
					href={link.url}
					target="_blank"
					rel="noopener noreferrer"
					variant="outline"
					size="icon"
					aria-label={CREW_LINK_LABELS[link.kind as CrewLinkKind] ?? 'Other link'}
					data-testid={`crew-contact-${link.kind}`}
				>
					<SocialIcon kind={link.kind} />
				</Button>
			{/each}
		</div>
	</Section>
{/if}
