import type { ReactNode } from "react";

/**
 * A small hand-rolled icon set.
 *
 * Emoji are not icons: they render differently on every platform and screen
 * readers announce them as prose. These are stroked SVGs on a 24px grid so they
 * inherit `currentColor` and optical weight from the text beside them.
 */
export type IconName =
  | "paw"
  | "route"
  | "shield"
  | "check"
  | "cross"
  | "alert"
  | "question"
  | "download"
  | "external"
  | "link";

const STROKED: ReadonlyArray<IconName> = [
  "route", "shield", "check", "cross", "alert", "question", "download", "external", "link",
];

const GLYPHS: Record<IconName, ReactNode> = {
  paw: (
    <>
      <ellipse cx="8.6" cy="8.4" rx="2" ry="2.6" />
      <ellipse cx="15.4" cy="8.4" rx="2" ry="2.6" />
      <ellipse cx="4.4" cy="12.6" rx="1.8" ry="2.3" />
      <ellipse cx="19.6" cy="12.6" rx="1.8" ry="2.3" />
      <path d="M12 12.4c3.2 0 5.5 2.5 5.5 4.9 0 2-1.7 3.1-3.5 2.6a7.4 7.4 0 0 0-4 0c-1.8.5-3.5-.6-3.5-2.6 0-2.4 2.3-4.9 5.5-4.9Z" />
    </>
  ),
  route: (
    <>
      <circle cx="6" cy="19" r="2.4" />
      <circle cx="18" cy="5" r="2.4" />
      <path d="M15.6 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H8.4" />
    </>
  ),
  shield: (
    <>
      <path d="M20 12.5c0 4.8-3.4 7.3-7.6 8.7a1.2 1.2 0 0 1-.8 0C7.4 19.8 4 17.3 4 12.5V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.2-2.7a1.2 1.2 0 0 1 1.6 0C14.5 3.8 17 5 19 5a1 1 0 0 1 1 1Z" />
      <path d="m9.2 12 2 2 3.6-3.8" />
    </>
  ),
  check: <path d="M20 6.5 9.4 17.2 4 11.8" />,
  cross: <path d="M17.5 6.5 6.5 17.5M6.5 6.5l11 11" />,
  alert: (
    <>
      <path d="m21.4 18.2-8-14a1.6 1.6 0 0 0-2.8 0l-8 14A1.6 1.6 0 0 0 4 20.6h16a1.6 1.6 0 0 0 1.4-2.4Z" />
      <path d="M12 9.4v4.2" />
      <path d="M12 17.2h.01" />
    </>
  ),
  question: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.3 9.3a2.8 2.8 0 0 1 5.4.9c0 1.9-2.7 2.5-2.7 2.5" />
      <path d="M12 16.6h.01" />
    </>
  ),
  download: (
    <>
      <path d="M20.5 15.5V19a1.8 1.8 0 0 1-1.8 1.8H5.3A1.8 1.8 0 0 1 3.5 19v-3.5" />
      <path d="m7.6 10.4 4.4 4.4 4.4-4.4" />
      <path d="M12 3.4v11.4" />
    </>
  ),
  external: (
    <>
      <path d="M14.6 3.4H20.6v6" />
      <path d="m10.4 13.6 10.2-10.2" />
      <path d="M18 13.2V19a1.8 1.8 0 0 1-1.8 1.8H5a1.8 1.8 0 0 1-1.8-1.8V7.8A1.8 1.8 0 0 1 5 6h5.8" />
    </>
  ),
  link: (
    <>
      <path d="M10.2 13.8a3.6 3.6 0 0 0 5.4.4l2.6-2.6a3.6 3.6 0 0 0-5.1-5.1l-1.5 1.5" />
      <path d="M13.8 10.2a3.6 3.6 0 0 0-5.4-.4l-2.6 2.6a3.6 3.6 0 0 0 5.1 5.1l1.5-1.5" />
    </>
  ),
};

export function Icon({
  name,
  size = 16,
  className,
}: {
  name: IconName;
  size?: number;
  className?: string;
}) {
  const stroked = STROKED.includes(name);
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={stroked ? "none" : "currentColor"}
      stroke={stroked ? "currentColor" : "none"}
      strokeWidth={stroked ? 1.9 : undefined}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {GLYPHS[name]}
    </svg>
  );
}
