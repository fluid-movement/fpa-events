<script lang="ts">
	import { page } from '$app/state';
	import { SITE_NAME, canEmitUrl, type PageMeta } from '#lib/utils/meta';

	let { title, description, image }: PageMeta = $props();

	// The public origin as Kit 3 derives it from the request, so the tags are
	// present in the server-rendered HTML that link-preview crawlers read.
	const url = $derived(page.url.origin + page.url.pathname);
	const showUrl = $derived(canEmitUrl(page.route.id));
	const isSiteDefault = $derived(title === SITE_NAME);
</script>

<svelte:head>
	<meta name="description" content={description} />
	<meta property="og:site_name" content={SITE_NAME} />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
	<meta property="og:type" content={isSiteDefault ? 'website' : 'article'} />
	{#if showUrl}
		<meta property="og:url" content={url} />
	{/if}
	<meta name="twitter:card" content={image ? 'summary_large_image' : 'summary'} />
	<meta name="twitter:title" content={title} />
	<meta name="twitter:description" content={description} />
	{#if image}
		<meta property="og:image" content={image.url} />
		<meta name="twitter:image" content={image.url} />
		{#if image.width && image.height}
			<meta property="og:image:width" content={String(image.width)} />
			<meta property="og:image:height" content={String(image.height)} />
		{/if}
	{/if}
</svelte:head>
