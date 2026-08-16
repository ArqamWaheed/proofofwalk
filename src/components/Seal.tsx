/**
 * A SHA-256 rendered as 32 bars, one per byte.
 *
 * Nobody reads a 64-character hex string, which is a problem for an app whose
 * entire job is "compare these two values". The bars give the eye something it
 * can actually diff: two hashes that differ anywhere produce visibly different
 * skylines.
 *
 * This is a reading aid and nothing more. The verdict is decided by comparing
 * the strings in `VerifyView`; the seal never decides anything. The full hex is
 * always rendered alongside so the authoritative value stays on screen.
 */

const SHA256_HEX = /^[0-9a-f]{64}$/i;

const BAR = 3;
const GAP = 1;
const HEIGHT = 32;

function toBytes(hash: string): number[] | null {
  if (!SHA256_HEX.test(hash)) return null;
  const bytes: number[] = [];
  for (let i = 0; i < hash.length; i += 2) {
    bytes.push(Number.parseInt(hash.slice(i, i + 2), 16));
  }
  return bytes;
}

export function Seal({
  hash,
  label,
  tone = "seal",
  showHex = true,
}: {
  hash: string;
  label: string;
  tone?: "seal" | "ember" | "rose";
  showHex?: boolean;
}) {
  const bytes = toBytes(hash);

  return (
    <div className={`seal seal--${tone}`}>
      <div className="seal__head">
        <span>{label}</span>
        <span>sha-256</span>
      </div>

      {bytes && (
        <svg
          className="seal__bars"
          viewBox={`0 0 ${bytes.length * (BAR + GAP) - GAP} ${HEIGHT}`}
          preserveAspectRatio="none"
          role="img"
          aria-label={`Bar fingerprint of the ${label} hash. The exact value is written out below.`}
        >
          {bytes.map((byte, i) => {
            const h = 2 + (byte / 255) * (HEIGHT - 2);
            return (
              <rect
                key={i}
                x={i * (BAR + GAP)}
                y={HEIGHT - h}
                width={BAR}
                height={h}
                style={{ animationDelay: `${i * 8}ms` }}
              />
            );
          })}
        </svg>
      )}

      {showHex && <p className="seal__hex">{hash}</p>}
    </div>
  );
}
