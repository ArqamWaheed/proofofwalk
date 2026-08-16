import type { Fix } from "../lib/trace";

/**
 * The route, drawn from the fixes themselves. No map tiles: the shape of the
 * walk is the only part we are entitled to show, and a basemap would leak the
 * walker's neighbourhood to whoever is looking at the screen.
 */
export function RouteSketch({ fixes }: { fixes: Fix[] }) {
  if (fixes.length < 2) {
    return <div className="sketch sketch--empty">waiting for a second fix…</div>;
  }

  const lats = fixes.map((f) => f.lat);
  const lons = fixes.map((f) => f.lon);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLon = Math.min(...lons), maxLon = Math.max(...lons);

  // Preserve aspect: a 400m x 40m out-and-back should look like one.
  const span = Math.max(maxLat - minLat, maxLon - minLon, 1e-5);
  const pad = 8;
  const project = (f: Fix): [number, number] => [
    pad + ((f.lon - minLon) / span) * (100 - pad * 2),
    // SVG y grows downward; latitude grows north.
    pad + ((maxLat - f.lat) / span) * (100 - pad * 2),
  ];

  const points = fixes.map(project).map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
  const [sx, sy] = project(fixes[0]);
  const [ex, ey] = project(fixes[fixes.length - 1]);

  return (
    <svg className="sketch" viewBox="0 0 100 100" role="img" aria-label="Route shape">
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="1.4"
        strokeLinejoin="round" strokeLinecap="round" opacity="0.85" />
      <circle cx={sx} cy={sy} r="2.2" className="sketch__start" />
      <circle cx={ex} cy={ey} r="2.2" className="sketch__end" />
    </svg>
  );
}
