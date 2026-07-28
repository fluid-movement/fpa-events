<script lang="ts">
	import PageShell from '$lib/components/layout/PageShell.svelte';
	import PageHeader from '$lib/components/layout/PageHeader.svelte';
</script>

<PageShell width="form" class="space-y-8">
	<PageHeader title="Legal Notice" description="Imprint / Anbieterkennzeichnung" class="pb-0" />

	<section class="space-y-2">
		<h2>Information according to § 5 DDG</h2>
		<p>
			<!-- TODO: Replace with operator name -->
			<strong>[OPERATOR NAME]</strong><br />
			<!-- TODO: Replace with street address -->
			[STREET ADDRESS]<br />
			<!-- TODO: Replace with city, postal code, country -->
			[CITY, POSTAL CODE, COUNTRY]
		</p>
	</section>

	<section class="space-y-2">
		<h2>Contact</h2>
		<p>
			Email:
			<!-- TODO: Replace with contact email -->
			<a href="mailto:[CONTACT EMAIL]" class="underline">[CONTACT EMAIL]</a>
		</p>
	</section>

	<section class="space-y-2">
		<h2>Liability for Content</h2>
		<p class="text-sm text-muted-foreground">
			The contents of this website have been created with the utmost care. However, we cannot
			guarantee the accuracy, completeness, or timeliness of the content. As a service provider, we
			are responsible for our own content on this website under general law. However, we are not
			obligated to monitor transmitted or stored third-party information or to investigate
			circumstances that indicate illegal activity.
		</p>
	</section>

	<section class="space-y-2">
		<h2>Liability for Links</h2>
		<p class="text-sm text-muted-foreground">
			Our website contains links to external websites of third parties over whose content we have no
			influence. Therefore we cannot accept any liability for this external content. The respective
			provider or operator of the linked pages is always responsible for the content of those pages.
			Linked pages were checked for possible legal violations at the time of linking. Illegal
			content was not recognizable at the time of linking.
		</p>
	</section>

	<section class="space-y-2">
		<h2>Copyright</h2>
		<p class="text-sm text-muted-foreground">
			The content and works on this website created by the site operators are subject to copyright.
			Duplication, processing, distribution, or any form of commercialization of such material
			beyond the scope of copyright law requires the written consent of its respective author or
			creator.
		</p>
	</section>
</PageShell>
