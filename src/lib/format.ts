/**
 * Money is stored as an integer number of ₮ (development.md §3). These helpers
 * format for display only — never use the formatted string for math.
 */

const mnt = new Intl.NumberFormat("mn-MN", {
  maximumFractionDigits: 0,
});

/** Format an integer ₮ amount, e.g. 45000 -> "45,000₮". */
export function formatPrice(amount: number): string {
  return `${mnt.format(Math.round(amount))}₮`;
}

/** Format a millilitre amount, e.g. 5 -> "5ml". */
export function formatMl(ml: number): string {
  return `${ml}ml`;
}

const dateFmt = new Intl.DateTimeFormat("mn-MN", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function formatDate(value: string | number | Date): string {
  return dateFmt.format(new Date(value));
}
