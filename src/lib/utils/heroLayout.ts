/**
 * Event hero layout, picked from the stored picture size so the page never
 * crops a poster. `banner` is a full-width uncropped strip; `split` puts the
 * details beside the picture; `unknown` is the one-column fallback for events
 * without a usable size.
 */
export const BANNER_MIN_RATIO = 1.4;

export type HeroLayout = 'banner' | 'split' | 'unknown';

function isPositive(value: number | null | undefined): value is number {
	return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

export function heroLayout(
	width: number | null | undefined,
	height: number | null | undefined
): HeroLayout {
	if (!isPositive(width) || !isPositive(height)) return 'unknown';
	return width / height >= BANNER_MIN_RATIO ? 'banner' : 'split';
}
