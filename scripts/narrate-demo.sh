#!/usr/bin/env bash
# Builds the narration track for the demo video and muxes it in.
#
# Piper is a neural TTS that runs entirely offline. The voice model is ~63 MB
# and is not committed; download it once:
#
#   python3 -m venv .venv && ./.venv/bin/pip install piper-tts
#   ./.venv/bin/python -m piper.download_voices en_GB-alan-medium --data-dir ./voices
#
# scripts/narration.json holds one line per caption, each with the millisecond
# timestamp that `record-demo.mjs` logged for that caption. The timings are
# recorded during the run rather than predicted, so speech lands on the frame
# its caption appears on.
set -euo pipefail
VIDEO=${1:?usage: narrate-demo.sh <video.mp4> <out.mp4>}
OUT=${2:?usage: narrate-demo.sh <video.mp4> <out.mp4>}
DUR=$(ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$VIDEO")

mkdir -p parts
python3 - "$DUR" <<'PY'
import json, subprocess, sys
dur = float(sys.argv[1])
lines = json.load(open("scripts/narration.json"))
for i, l in enumerate(lines):
    subprocess.run(["./.venv/bin/piper", "-m", "voices/en_GB-alan-medium.onnx",
                    "-f", f"parts/{i:02d}.wav", "--length-scale", "0.96"],
                   input=l["say"], text=True, capture_output=True)
ins, filt = [], []
for i, l in enumerate(lines):
    ins += ["-i", f"parts/{i:02d}.wav"]
    filt.append(f"[{i}:a]adelay={int(l['at'])}|{int(l['at'])}[a{i}]")
mix = "".join(f"[a{i}]" for i in range(len(lines)))
filt.append(f"{mix}amix=inputs={len(lines)}:normalize=0:dropout_transition=0[m]")
filt.append(f"[m]loudnorm=I=-16:TP=-1.5:LRA=11,apad=whole_dur={dur}[out]")
subprocess.run(["ffmpeg","-hide_banner","-loglevel","error",*ins,
                "-filter_complex",";".join(filt),"-map","[out]",
                "-ar","48000","-ac","2","-y","narration.wav"], check=True)
PY

ffmpeg -hide_banner -loglevel error -i "$VIDEO" -i narration.wav \
  -c:v copy -c:a aac -b:a 160k -shortest -movflags +faststart -y "$OUT"
echo "wrote $OUT"
