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

	const observer = new MutationObserver(measure);
	observer.observe(node, {
		attributes: true,
		attributeFilter: ['data-state', 'aria-current', 'data-variant', 'data-orientation'],
		childList: true,
		subtree: true
	});

	// Fires once on observe, which is what places the indicator initially.
	const resize =
		typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(() => measure());
	resize?.observe(node);
	if (!resize) measure();

	// Labels reflow once the webfont lands, which moves the tab boundaries.
	document.fonts?.ready.then(measure);

	return {
		destroy() {
			observer.disconnect();
			resize?.disconnect();
		}
	};
}
