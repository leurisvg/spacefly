/** Pre-formatted rows for the accessible table view of a chart. */
export interface ChartTable {
  columns: string[];
  rows: string[][];
  /** Column indexes that hold numbers (right-aligned, mono). */
  numeric?: number[];
}
