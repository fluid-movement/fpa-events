<script lang="ts">
	import type { Component } from 'svelte';
	import RichContent from '#lib/components/RichContent.svelte';
	import Section from '#lib/components/layout/Section.svelte';
	import { Badge } from '#lib/components/ui/badge';
	import { Button } from '#lib/components/ui/button';
	import AtSignIcon from '@lucide/svelte/icons/at-sign';
	import GlobeIcon from '@lucide/svelte/icons/globe';
	import HandshakeIcon from '@lucide/svelte/icons/handshake';
	import LinkIcon from '@lucide/svelte/icons/link';
	import type { PlayerBio, PlayerBioLink, PlayerBioSection } from '#lib/results/types';

	/**
	 * The fpa-profiles story behind a player — bio, story fields, links. The
	 * header fields (nickname, headline, playing since) are rendered by the
	 * panel's page header, so this renders nothing when only those are set.
	 */
	let { bio }: { bio: PlayerBio } = $props();

	const LINK_ICONS: Record<PlayerBioLink['kind'], Component> = {
		website: GlobeIcon,
		sponsor: HandshakeIcon,
		social: AtSignIcon,
		other: LinkIcon
	};

	/** Past this a story field reads better across the full width on desktop. */
	const LONG_TEXT = 160;
	const isLong = (section: PlayerBioSection) =>
		section.kind === 'text' && section.text.length > LONG_TEXT;

	/**
	 * Which cards span both desktop columns: long ones, plus a short card that
	 * would otherwise sit alone in its row next to an empty cell.
	 */
	const wide = $derived.by(() => {
		const flags = bio.sections.map(isLong);
		let column = 0;
		for (let i = 0; i < flags.length; i++) {
			if (flags[i]) {
				column = 0;
				continue;
			}
			const rowEnds = i === flags.length - 1 || flags[i + 1];
			if (column === 0 && rowEnds) flags[i] = true;
			else column = (column + 1) % 2;
		}
		return flags;
	});

	const hasBody = $derived(bio.bioHtml !== null || bio.sections.length > 0 || bio.links.length > 0);
</script>

{#if hasBody}
	<Section title="About" class="mb-6">
		<div class="space-y-3" data-testid="player-bio">
			{#if bio.bioHtml}
				<div class="surface rounded-xl px-4 py-4 md:px-6 md:py-5">
					<RichContent content={bio.bioHtml} class="[&>:last-child]:mb-0" />
				</div>
			{/if}

			{#if bio.sections.length > 0}
				<dl class="grid gap-3 md:grid-cols-2">
					{#each bio.sections as section, i (section.key)}
						<div class="surface-row rounded-xl px-4 py-3 {wide[i] ? 'md:col-span-2' : ''}">
							<dt class="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
								{section.label}
							</dt>
							{#if section.kind === 'text'}
								<!-- Story fields are plain text whose line breaks carry meaning —
								     mentors are often one name per line. -->
								<dd class="mt-1.5 leading-relaxed break-words whitespace-pre-line">
									{section.text}
								</dd>
							{:else}
								<dd class="mt-2 flex flex-wrap gap-1.5">
									{#each section.names as name, n (n)}
										<Badge variant="secondary">{name}</Badge>
									{/each}
								</dd>
							{/if}
						</div>
					{/each}
				</dl>
			{/if}

			{#if bio.links.length > 0}
				<ul class="flex flex-wrap gap-2" data-testid="player-links">
					{#each bio.links as link, i (i)}
						{@const Icon = LINK_ICONS[link.kind]}
						<li class="max-w-full">
							<Button
								href={link.url}
								variant="outline"
								size="sm"
								target="_blank"
								rel="noopener noreferrer nofollow"
								class="max-w-full"
							>
								<Icon />
								<span class="truncate">{link.label}</span>
							</Button>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	</Section>
{/if}
