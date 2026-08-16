import type { CSSProperties } from "react";
import type { Fix } from "../lib/trace";

/**
 * The route, drawn from the fixes themselves. No map tiles: the shape of the
 * walk is the only part we are entitled to show, and a basemap would leak the
 * walker's neighbourhood to whoever is looking at the screen.
 */
export function RouteSketch({ fixes, live = false }: { fixes: Fix[]; live?: boolean }) {
  if (fixes.length < 2) {
    return (
      <div className="sketch sketch--empty">
        {live ? "listening for a second fix" : "no route yet"}
      </div>
    );
  }

  const lats = fixes.map((f) => f.lat);
  const lons = fixes.map((f) => f.lon);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLon = Math.min(...lons), maxLon = Math.max(...lons);

  // Preserve aspect: a 400m x 40m out-and-back should look like one.
  const span = Math.max(maxLat - minLat, maxLon - minLon, 1e-5);
  const pad = 10;
  const project = (f: Fix): [number, number] => [
    pad + ((f.lon - minLon) / span) * (100 - pad * 2),
    // SVG y grows downward; latitude grows north.
    pad + ((maxLat - f.lat) / span) * (100 - pad * 2),
  ];

  const projected = fixes.map(project);
  const points = projected.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" ");

  // Drawing the stroke on requires knowing how long it is.
  let length = 0;
  for (let i = 1; i < projected.length; i++) {
    length += Math.hypot(projected[i][0] - projected[i - 1][0], projected[i][1] - projected[i - 1][1]);
  }

  const [sx, sy] = projected[0];
  const [ex, ey] = projected[projected.length - 1];

  // A live route redraws on every fix; replaying the animation each time would
  // make the last leg flicker. Only the finished route gets drawn on.
  const style = { "--len": length.toFixed(2) } as CSSProperties;

  return (
    <div className="sketch">
      <svg
        className="sketch__canvas"
        viewBox="0 0 100 100"
        role="img"
        aria-label={`Shape of the recorded route, drawn from ${fixes.length} GPS fixes.`}
      >
        <polyline
          className={live ? "sketch__path" : "sketch__path sketch__path--draw"}
          style={live ? undefined : style}
          points={points}
        />
        <circle className="sketch__start" cx={sx} cy={sy} r="2.4" />
        <circle className="sketch__end" cx={ex} cy={ey} r="2.4" />
      </svg>

      <p className="sketch__legend">
        <span className="sketch__key sketch__key--start">start</span>
        <span className="sketch__key sketch__key--end">{live ? "now" : "end"}</span>
      </p>
    </div>
  );
}
