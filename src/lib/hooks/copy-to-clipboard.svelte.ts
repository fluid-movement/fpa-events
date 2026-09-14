/** How long the "Copied" confirmation stays up. */
const FEEDBACK_MS = 2000;

/**
 * Copy-to-clipboard with a self-clearing "Copied" flag.
 *
 * ```svelte
 * const copy = new CopyToClipboard();
 * <button onclick={() => copy.write(url)}>{copy.copied ? 'Copied' : 'Copy'}</button>
 * ```
 *
 * Call `dispose()` from an `$effect` teardown so a pending timer cannot fire
 * after the component is gone.
 */
export class CopyToClipboard {
	copied = $state(false);

	#timer: ReturnType<typeof setTimeout> | undefined;

	async write(value: string): Promise<void> {
		try {
			await navigator.clipboard.writeText(value);
			this.copied = true;
			clearTimeout(this.#timer);
			this.#timer = setTimeout(() => (this.copied = false), FEEDBACK_MS);
		} catch {
			// Clipboard is blocked (insecure origin, denied permission). Callers
			// keep the value selectable, so there is still a way through.
			this.copied = false;
		}
	}

	dispose(): void {
		clearTimeout(this.#timer);
	}
}
