"""Make a seamless, gently moving loop from a still picture with glowing light (aurora, sky glow).

The bright, soft parts sway and shimmer; dark silhouettes such as trees stay still. Every motion
is periodic over the clip, so the last frame meets the first. Output is H.264 MP4 for the TV with
the first frame embedded as cover art (Samsung TVs cannot read a frame back from video),
sized to stay under ntfy.sh's 2 MB attachment limit for a 12-second 1080p clip.
Usage: python3 scripts/animate-glow.py photo.jpg loop.mp4 [seconds=12]
Environment: CRF (quality, default 26; lower is larger), W/H (output size), DITHER (default 0.5).
"""
import sys, subprocess, numpy as np
from PIL import Image, ImageFilter
src, out = sys.argv[1], sys.argv[2]
W, H, FPS, SECONDS = 1920, 1080, 30, int(sys.argv[3]) if len(sys.argv) > 3 else 12
N = FPS * SECONDS
import os
CRF = os.environ.get('CRF', '26'); DITHER = float(os.environ.get('DITHER', '0.5')); W, H = int(os.environ.get('W', W)), int(os.environ.get('H', H))
im = Image.open(src).convert('RGB')
r = max(W / im.width, H / im.height); im = im.resize((round(im.width * r), round(im.height * r)), Image.LANCZOS)
l, t = (im.width - W) // 2, (im.height - H) // 2; im = im.crop((l, t, l + W, t + H))
base = np.asarray(im).astype(np.float32) / 255.0
lum = base @ np.array([.2126, .7152, .0722], np.float32)
# Aurora weight: bright sky, not the dark trees; softened so edges never tear.
m = np.clip((lum - .10) / .30, 0, 1) ** 1.2
mask_img = Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(18))
M = np.asarray(mask_img).astype(np.float32) / 255.0
# Keep the silhouettes still: fade the effect out where it is dark nearby (trees) and near the bottom.
dark = np.asarray(Image.fromarray(((lum < .07) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(10))).astype(np.float32) / 255.0
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
M *= (1 - np.clip(dark * 1.6, 0, 1)) * np.clip((H * .92 - yy) / (H * .25), 0, 1)
# Spatial phases (precomputed): sin(a + k*phi) = sin a cos k*phi + cos a sin k*phi
def wave(ax, ay, off): a = 2 * np.pi * (xx / ax + yy / ay) + off; return np.sin(a), np.cos(a)
w1 = wave(1e9, 520, 0.0)       # curtains sway sideways, varying with height
w2 = wave(900, 1400, 1.7)
w3 = wave(1e9, 260, 0.6)       # gentle vertical ripple
g1 = wave(700, -2600, 0.3)     # brightness bands travelling across
g2 = wave(-430, 1800, 2.1)
def comb(w, k, phi): s, c = w; return s * np.cos(k * phi) + c * np.sin(k * phi)
p = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
    '-c:v', 'libx264', '-preset', 'veryslow', '-crf', CRF, '-x264-params', 'aq-mode=3:aq-strength=1.1:deblock=1,1', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-level', '4.1',
    '-g', str(FPS * 2), '-an', out + '.video.mp4'], stdin=subprocess.PIPE)
rng = np.random.default_rng(7); dither = (rng.random((H, W, 3), np.float32) - .5) / 255.0
for f in range(N):
    phi = 2 * np.pi * f / N
    dx = M * (9.0 * comb(w1, 1, phi) + 5.0 * comb(w2, 2, phi))
    dy = M * (3.0 * comb(w3, 1, phi))
    sx = np.clip(xx - dx, 0, W - 1.001); sy = np.clip(yy - dy, 0, H - 1.001)
    x0 = sx.astype(np.int32); y0 = sy.astype(np.int32); fx = (sx - x0)[..., None]; fy = (sy - y0)[..., None]
    a = base[y0, x0]; b = base[y0, x0 + 1]; c = base[y0 + 1, x0]; d = base[y0 + 1, x0 + 1]
    frame = (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy
    gain = 1 + M * (.16 * comb(g1, 1, phi) + .08 * comb(g2, 1, phi))
    frame = frame * gain[..., None] + dither * DITHER
    p.stdin.write((np.clip(frame, 0, 1) * 255 + .5).astype(np.uint8).tobytes())
    if f % 60 == 0: print('frame', f, '/', N, flush=True)
p.stdin.close(); p.wait()
# Samsung TVs cannot copy a video frame to canvas, so the first frame travels inside the file as
# MP4 cover art; Frame Home builds the photo and glass from it.
poster = out + '.poster.jpg'
Image.fromarray((base * 255).astype(np.uint8)).resize((1280, 720), Image.LANCZOS).save(poster, quality=82)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', out + '.video.mp4', '-i', poster, '-map', '0:v', '-map', '1', '-c', 'copy',
    '-disposition:v:1', 'attached_pic', '-movflags', '+faststart', out], check=True)
import os
os.remove(out + '.video.mp4'); os.remove(poster)
print('Wrote', out, os.path.getsize(out), 'bytes')
