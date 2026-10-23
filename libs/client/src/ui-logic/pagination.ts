/** Records shown at a time in the per-account lists. */
export const PAGE_SIZE = 50;

/** How many pages `count` records make (at least one, so an empty list still says "1 of 1"). */
export function totalPages(count: number, pageSize = PAGE_SIZE): number {
  return Math.max(1, Math.ceil(count / pageSize));
}

/** The records of a 1-based page. */
export function pageSlice<T>(rows: readonly T[], page: number, pageSize = PAGE_SIZE): T[] {
  return rows.slice((page - 1) * pageSize, page * pageSize);
}
