// French grouping puts a thin no-break space between thousands, so 2956 reads as "2 956" without
// post-processing the string, and NumberFlow can take the same locale for its rolling digits.
export const POINTS_LOCALE = 'fr-FR'

const formatter = new Intl.NumberFormat(POINTS_LOCALE)

export const formatPoints = (points: number): string => formatter.format(points)
