/**
 * Slides a shared highlight behind the active tab.
 *
 * The highlight element is rendered by the caller (any child carrying
 * `data-tab-indicator`) rather than injected here, so nothing appears in the
 * DOM that Svelte doesn't manage. Active items are found by `data-state`
 * (bits-ui tabs) or `aria-current` (link-based tab bars, e.g. the event admin).
 *
 * It is a pure enhancement: with no JS the indicator never becomes visible and
 * the active tab falls back to a flat background (see `.tabs-track` in
 * layout.css).
 */
export function tabIndicator(node: HTMLElement) {
	const indicator = node.querySelector<HTMLElement>('[data-tab-indicator]');
	if (!indicator) return { destroy() {} };

	let placed = false;

	const measure = () => {
		const active = node.querySelector<HTMLElement>('[data-state="active"], [aria-current="page"]');
		if (!active) {
			indicator.dataset.visible = 'false';
			return;
		}

		const vertical =
			(node.getAttribute('aria-orientation') ?? node.dataset.orientation) === 'vertical';
		// The line variant draws a bar along the active edge instead of a pill.
		const bar = node.dataset.variant === 'line';

		let x = active.offsetLeft;
		let y = active.offsetTop;
		let width = active.offsetWidth;
		let height = active.offsetHeight;

		if (bar) {
			if (vertical) {
				x += width;
				width = 2;
			} else {
				y += height;
				height = 2;
			}
		}

		indicator.style.width = `${width}px`;
		indicator.style.height = `${height}px`;
		indicator.style.transform = `translate3d(${x}px, ${y}px, 0)`;
		indicator.dataset.visible = 'true';

		if (!placed) {
			placed = true;
			// Animate only from the second placement on, so the highlight doesn't
			// fly in from the corner on first paint.
			requestAnimationFrame(() => {
				indicator.dataset.animate = 'true';
			});
		}
	};

	let alive = true;

	// Every entry point goes through this: observers and the font promise can all
	// fire after the tab bar has been torn down by a navigation, and measuring a
	// detached node yields zeroes that would park the indicator in the corner.
	const safeMeasure = () => {
		if (!alive || !node.isConnected) return;
		measure();
	};

	const observer = new MutationObserver(safeMeasure);
	observer.observe(node, {
		attributes: true,
		attributeFilter: ['data-state', 'aria-current', 'data-variant', 'data-orientation'],
		childList: true,
		subtree: true
	});

	// Fires once on observe, which is what places the indicator initially.
	const resize =
		typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(safeMeasure);
	resize?.observe(node);
	if (!resize) safeMeasure();

	// Labels reflow once the webfont lands, which moves the tab boundaries. This
	// promise can't be cancelled, so the `alive` flag is what stops it.
	document.fonts?.ready.then(safeMeasure);

	return {
		destroy() {
			alive = false;
			observer.disconnect();
			resize?.disconnect();
		}
	};
}
