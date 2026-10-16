"""Small original PCM sound effects; deterministic, no network or dependencies."""
import math
from pathlib import Path
import random
import struct
import wave

OUT = Path(__file__).resolve().parents[1] / "assets" / "audio"
RATE = 22050


def render(name, seconds, synth):
    rng = random.Random(412)
    samples = []
    for i in range(int(RATE * seconds)):
        t = i / RATE
        # Smooth attack avoids digital clicks; peak is limited for headphones.
        value = synth(t, rng) * min(1, t / .002) * min(1, (seconds - t) / .015)
        samples.append(struct.pack("<h", int(max(-.7, min(.7, value)) * 32767)))
    with wave.open(str(OUT / f"{name}.wav"), "wb") as file:
        file.setparams((1, 2, RATE, 0, "NONE", "not compressed"))
        file.writeframes(b"".join(samples))


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
