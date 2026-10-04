export interface SparklineGeometry {
  /** `x,y x,y …` for a polyline. */
  line: string;
  /** Closed path under the line. */
  area: string;
  last: number[];
}

/** SVG geometry of a trend line scaled to `width` × `height`. `null` below two points. */
export function sparklineGeometry(values: number[], width = 100, height = 32): SparklineGeometry | null {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((y, i) => [(i / (values.length - 1)) * width, height - 2 - ((y - min) / span) * (height - 4)]);
  const line = pts.map((p) => p.join(',')).join(' ');
  const area = `M0,${height} L${pts.map((p) => p.join(',')).join(' L')} L${width},${height} Z`;
  return { line, area, last: pts[pts.length - 1] };
}
