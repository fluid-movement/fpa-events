<script lang="ts">
	interface Props {
		currentUrl?: string | null;
		currentWidth?: number | null;
		currentHeight?: number | null;
	}

	let { currentUrl = null, currentWidth = null, currentHeight = null }: Props = $props();

	type Upload = { url: string; width: number; height: number };

	// Only the newly uploaded values are state; what to display is derived from
	// those plus the props, so there is one source of truth for each.
	let upload = $state<Upload | null>(null);
	let localPreview = $state('');
	let uploading = $state(false);
	let uploadError = $state('');

	const previewUrl = $derived(localPreview || currentUrl || '');
	const pictureUrl = $derived(upload?.url ?? currentUrl ?? '');
	const pictureWidth = $derived(upload?.width ?? currentWidth ?? 0);
	const pictureHeight = $derived(upload?.height ?? currentHeight ?? 0);

	/** Natural dimensions, so the form can store them and reserve layout space. */
	function readDimensions(file: File): Promise<{ width: number; height: number }> {
		return new Promise((resolve, reject) => {
			const objectUrl = URL.createObjectURL(file);
			const img = new Image();
			const done = () => URL.revokeObjectURL(objectUrl);

			img.onload = () => {
				resolve({ width: img.naturalWidth, height: img.naturalHeight });
				done();
			};
			img.onerror = () => {
				reject(new Error('Invalid image'));
				done();
			};
			img.src = objectUrl;
		});
	}

	function setPreview(objectUrl: string) {
		if (localPreview) URL.revokeObjectURL(localPreview);
		localPreview = objectUrl;
	}

	async function handleFileChange(e: Event) {
		const file = (e.currentTarget as HTMLInputElement).files?.[0];
		if (!file) return;

		uploadError = '';
		uploading = true;
		setPreview(URL.createObjectURL(file));

		try {
			const dimensions = await readDimensions(file);

			const body = new FormData();
			body.append('file', file);
			const res = await fetch('/api/events/upload-image', { method: 'POST', body });

			const payload = (await res.json()) as { url?: string; error?: string };
			if (!res.ok || !payload.url) throw new Error(payload.error ?? 'Upload failed');

			upload = { url: payload.url, ...dimensions };
		} catch (err) {
			uploadError = err instanceof Error ? err.message : 'Upload failed';
			setPreview('');
		} finally {
			uploading = false;
		}
	}

	// The preview is a blob URL owned by this component; release it on teardown.
	$effect(() => () => {
		if (localPreview) URL.revokeObjectURL(localPreview);
	});
</script>

<div class="flex flex-col gap-3">
	{#if previewUrl}
		<div class="w-full max-w-md overflow-hidden rounded-lg border border-border">
			<img src={previewUrl} alt="Event cover preview" class="max-h-48 w-full object-cover" />
		</div>
	{:else}
		<div
			class="flex max-w-md items-center justify-center rounded-lg border border-dashed border-border p-8 text-sm text-muted-foreground"
		>
			No image selected
		</div>
	{/if}

	<label class="w-fit cursor-pointer">
		<span
			class="text-sm text-primary underline-offset-4 hover:underline {uploading
				? 'opacity-50'
				: ''}"
		>
			{#if uploading}
				Uploading…
			{:else if previewUrl}
				Change image
			{:else}
				Upload image
			{/if}
		</span>
		<input
			type="file"
			accept="image/*"
			class="hidden"
			disabled={uploading}
			onchange={handleFileChange}
		/>
	</label>

	{#if uploadError}
		<p class="text-sm text-destructive">{uploadError}</p>
	{/if}

	<input type="hidden" name="picture" value={pictureUrl} />
	<input type="hidden" name="pictureWidth" value={pictureWidth || ''} />
	<input type="hidden" name="pictureHeight" value={pictureHeight || ''} />
</div>
