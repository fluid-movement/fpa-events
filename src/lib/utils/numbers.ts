/**
 * Score formatting shared by the rankings and results tables.
 *
 * Points usually land on a whole number but can carry a decimal (203.8, or a
 * raw judged score like 184.64377439762248). One decimal place is as much
 * precision as means anything to a reader.
 */
export const formatPoints = (points: number): string =>
	Number.isInteger(points) ? String(points) : points.toFixed(1);
