import { hashTrace, type Trace } from "../src/lib/trace";

const good: Trace = { version: 1, dog: "Rufus", fixes: [
  { t: 1000, lat: 30.26690, lon: -97.77290 },
  { t: 1015, lat: 30.26700, lon: -97.77300 },
]};

// What a walker could hand the owner instead of the real trace.
const cases: Array<[string, unknown]> = [
  ["missing `t` on a fix", { version: 1, dog: "Rufus", fixes: [{ lat: 30.2669, lon: -97.7729 }, { lat: 30.267, lon: -97.773 }] }],
  ["lat as string",        { version: 1, dog: "Rufus", fixes: [{ t: 1000, lat: "30.26690", lon: -97.7729 }] }],
  ["fixes: []",            { version: 1, dog: "Rufus", fixes: [] }],
  ["lat NaN",              { version: 1, dog: "Rufus", fixes: [{ t: 1000, lat: NaN, lon: -97.7729 }] }],
];

console.log("good hash:", (await hashTrace(good)).slice(0, 16));
for (const [label, bad] of cases) {
  try {
    const h = await hashTrace(bad as Trace);
    console.log(`${label.padEnd(22)} -> hashed OK: ${h.slice(0, 16)}  (no error raised)`);
  } catch (e) {
    console.log(`${label.padEnd(22)} -> threw: ${(e as Error).message.slice(0, 60)}`);
  }
}
