<script lang="ts">
	interface Props {
		currentUrl?: string | null;
		currentWidth?: number | null;
		currentHeight?: number | null;
	}

	let { currentUrl = null, currentWidth = null, currentHeight = null }: Props = $props();

	// Only track the newly uploaded values — derive display values from these + props
	let uploadedUrl = $state('');
	let uploadedWidth = $state(0);
	let uploadedHeight = $state(0);
	let localPreview = $state('');
	let uploading = $state(false);
	let uploadError = $state('');

	const previewUrl = $derived(localPreview || currentUrl || '');
	const pictureUrl = $derived(uploadedUrl || currentUrl || '');
	const pictureWidth = $derived(uploadedUrl ? uploadedWidth : (currentWidth ?? 0));
	const pictureHeight = $derived(uploadedUrl ? uploadedHeight : (currentHeight ?? 0));

	function getDimensions(file: File): Promise<{ width: number; height: number }> {
		return new Promise((resolve, reject) => {
			const url = URL.createObjectURL(file);
			const img = new Image();
			img.onload = () => {
				resolve({ width: img.naturalWidth, height: img.naturalHeight });
				URL.revokeObjectURL(url);
			};
			img.onerror = () => reject(new Error('Invalid image'));
			img.src = url;
		});
	}

	async function handleFileChange(e: Event) {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (!file) return;

		uploadError = '';
		uploading = true;
		localPreview = URL.createObjectURL(file);

		try {
			const dims = await getDimensions(file);

			const fd = new FormData();
			fd.append('file', file);
			const res = await fetch('/api/events/upload-image', { method: 'POST', body: fd });

			if (!res.ok) {
				const body = await res.json();
				throw new Error(body.error ?? 'Upload failed');
			}

			const data = await res.json();
			uploadedUrl = data.url;
			uploadedWidth = dims.width;
			uploadedHeight = dims.height;
		} catch (err) {
			uploadError = err instanceof Error ? err.message : 'Upload failed';
			localPreview = '';
		} finally {
			uploading = false;
		}
	}
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
