"""Original, sample-free PCM effects; deterministic, no network or dependencies.

Run normally to regenerate all seven game effects, or pass --check to verify
the shipped WAV files without modifying them. No recordings or audio libraries
are used: every sample comes from oscillators and seeded noise below.
"""
import argparse
import io
import math
from pathlib import Path
import random
import struct
import wave

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--out-dir", type=Path,
                    default=Path(__file__).resolve().parents[1] / "assets" / "audio")
parser.add_argument("--check", action="store_true")
args = parser.parse_args()
OUT = args.out_dir
RATE = 22050


def render(name, seconds, synth):
    rng = random.Random(412)
    samples = []
    for i in range(int(RATE * seconds)):
        t = i / RATE
        # Smooth attack avoids digital clicks; peak is limited for headphones.
        value = synth(t, rng) * min(1, t / .002) * min(1, (seconds - t) / .015)
        samples.append(struct.pack("<h", int(max(-.7, min(.7, value)) * 32767)))
    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as file:
        file.setparams((1, 2, RATE, 0, "NONE", "not compressed"))
        file.writeframes(b"".join(samples))
    target = OUT / f"{name}.wav"
    if args.check:
        if not target.exists() or target.read_bytes() != buffer.getvalue():
            raise SystemExit(f"Synthesis mismatch: {target.name}")
        print(f"Verified original synthesis: {target.name}")
    else:
        OUT.mkdir(parents=True, exist_ok=True)
        target.write_bytes(buffer.getvalue())


# Short damped tones/noise provide wood, twine and water feedback without
# copying any recorded sound. Durations stay compatible with the sound hook.
render("wood", .17, lambda t, r:
       .34 * r.uniform(-1, 1) * math.exp(-t * 65)
       + .22 * math.sin(2 * math.pi * 340 * t) * math.exp(-t * 35)
       + .10 * math.sin(2 * math.pi * 810 * t) * math.exp(-t * 50))
render("rope", .13, lambda t, r:
       .28 * r.uniform(-1, 1) * math.exp(-t * 75)
       + .28 * math.sin(2 * math.pi * (1250 * t - 2100 * t * t)) * math.exp(-t * 45))
render("splash", .50, lambda t, r:
       .22 * r.uniform(-1, 1) * math.exp(-t * 10)
       + .16 * math.sin(2 * math.pi * (510 * t + 340 * t * t)) * math.exp(-t * 12)
       + .12 * math.sin(2 * math.pi * 820 * t) * math.exp(-t * 15))
render("drop", .18, lambda t, r:
       .34 * math.sin(2 * math.pi * (1100 * t - 1600 * t * t)) * math.exp(-t * 22)
       + .08 * math.sin(2 * math.pi * 1780 * t) * math.exp(-t * 35))


render("impact", .18, lambda t, r:
       .30 * math.sin(2 * math.pi * 640 * t) * math.exp(-t * 45)
       + .18 * math.sin(2 * math.pi * 1730 * t) * math.exp(-t * 32)
       + .18 * r.uniform(-1, 1) * math.exp(-t * 40))
render("lose", .32, lambda t, r:
       .20 * math.sin(2 * math.pi * (480 * t - 490 * t * t)) * math.exp(-t * 10)
       + .24 * r.uniform(-1, 1) * math.exp(-t * 16)
       + .10 * math.sin(2 * math.pi * 2300 * t) * math.exp(-t * 22))
render("gravity", .24, lambda t, r:
       .22 * math.sin(2 * math.pi * (280 * t + 1250 * t * t)) * math.sin(math.pi * t / .24)
       + .06 * math.sin(2 * math.pi * 960 * t) * math.exp(-t * 10))
