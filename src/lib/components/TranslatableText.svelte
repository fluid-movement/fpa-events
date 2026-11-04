<script lang="ts">
	import RichContent from '#lib/components/RichContent.svelte';
	import { Button } from '#lib/components/ui/button';
	import { shouldOfferTranslation } from '#lib/translate';

	type Translator = { translate(text: string): Promise<string>; destroy?(): void };
	type TranslationOptions = { sourceLanguage: string; targetLanguage: string };
	type TranslatorFactory = {
		availability(options: TranslationOptions): Promise<string>;
		create(options: TranslationOptions): Promise<Translator>;
	};

	let { content, bodyLang }: { content: string; bodyLang: string } = $props();
	let body = $state<HTMLDivElement>();
	let available = $state(false);
	let pending = $state(false);
	let translated = $state(false);
	let targetLanguage = $state('');
	let originalNodes: { node: Text; text: string }[] = [];
	let generation = 0;

	function translatorFactory(): TranslatorFactory | undefined {
		if (!('Translator' in self)) return;
		return (self as unknown as { Translator?: TranslatorFactory }).Translator;
	}

	$effect(() => {
		// Availability and translated DOM belong to this exact body and language.
		void content;
		const sourceLanguage = bodyLang;
		const current = ++generation;
		available = false;
		pending = false;
		translated = false;
		originalNodes = [];
		targetLanguage = navigator.languages[0] ?? navigator.language;
		const api = translatorFactory();
		if (api && shouldOfferTranslation(sourceLanguage, [targetLanguage])) {
			void api.availability({ sourceLanguage, targetLanguage }).then(
				(status) => {
					if (current === generation) available = status !== 'unavailable';
				},
				() => {
					/* Keep the original when browser translation cannot be used. */
				}
			);
		}
		return () => {
			generation++;
		};
	});

	async function translate() {
		const api = translatorFactory();
		if (!api || !body || pending) return;
		const current = generation;
		pending = true;
		let translator: Translator | undefined;
		try {
			translator = await api.create({ sourceLanguage: bodyLang, targetLanguage });
			const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT);
			const nodes: { node: Text; text: string; translated: string }[] = [];
			while (walker.nextNode()) {
				const node = walker.currentNode as Text;
				if (node.data.trim()) {
					nodes.push({ node, text: node.data, translated: await translator.translate(node.data) });
				}
			}
			if (current !== generation) return;
			originalNodes = nodes;
			// Only text nodes are replaced: translated markup remains literal text.
			for (const { node, translated: text } of nodes) node.data = text;
			translated = true;
		} catch {
			if (current === generation) available = false;
		} finally {
			translator?.destroy?.();
			if (current === generation) pending = false;
		}
	}

	function showOriginal() {
		for (const { node, text } of originalNodes) node.data = text;
		originalNodes = [];
		translated = false;
	}
</script>

{#key content + bodyLang}
	<div bind:this={body} lang={translated ? targetLanguage : bodyLang} data-testid="crew-body">
		<RichContent {content} />
	</div>
{/key}
{#if available}
	{#if translated}
		<Button variant="ghost" size="sm" onclick={showOriginal} data-testid="show-original">
			Show original
		</Button>
	{:else}
		<Button
			variant="ghost"
			size="sm"
			onclick={translate}
			disabled={pending}
			data-testid="translate-text"
		>
			{pending ? 'Translating…' : 'Translate'}
		</Button>
	{/if}
{/if}
