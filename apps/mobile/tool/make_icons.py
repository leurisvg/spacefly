"""Draws the launcher icons of both platforms from the web's logo (apps/web/public/favicon.svg).

    python3 -I apps/mobile/tool/make_icons.py

Needs Pillow and fontTools (its SVG path parser). Rewrites the Android mipmaps and adaptive icon's foreground, the iOS AppIcon set and the iOS launch image; nothing else.
The rocket is the path of the SVG; the background is its gradient (#6366f1 → #7c3aed).
"""
import re
import json
from pathlib import Path

from fontTools.pens.recordingPen import RecordingPen
from fontTools.svgLib.path import parse_path
from PIL import Image, ImageChops, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
SVG = (ROOT.parents[1] / 'apps/web/public/favicon.svg').read_text()
ROCKET = re.search(r'<path d="([^"]+)" fill="#fff"', SVG).group(1)
TOP, BOTTOM = (0x63, 0x66, 0xF1), (0x7C, 0x3A, 0xED)
SS = 4  # supersampling


def flatten(commands, scale, dx, dy):
    """The rocket's outlines as lists of points (cubic curves sampled)."""
    contours, current, last = [], [], (0, 0)
    for op, pts in commands:
        p = [((x * scale + dx) * SS, (y * scale + dy) * SS) for x, y in pts]
        if op == 'moveTo':
            current = [p[0]]
        elif op == 'lineTo':
            current.append(p[0])
        elif op == 'curveTo':
            p0 = current[-1]
            for i in range(1, 17):
                t = i / 16
                u = 1 - t
                x = u**3 * p0[0] + 3 * u * u * t * p[0][0] + 3 * u * t * t * p[1][0] + t**3 * p[2][0]
                y = u**3 * p0[1] + 3 * u * u * t * p[0][1] + 3 * u * t * t * p[1][1] + t**3 * p[2][1]
                current.append((x, y))
        elif op in ('closePath', 'endPath'):
            if current:
                contours.append(current)
            current = []
    return contours


def rocket_mask(size, fraction):
    """The rocket as a mask, covering [fraction] of the canvas and centered (in the SVG it spans x 6.5-23, y 7-24)."""
    pen = RecordingPen()
    parse_path(ROCKET, pen)
    scale = size * fraction / 17.5
    dx, dy = size / 2 - 14.75 * scale, size / 2 - 15.5 * scale
    mask = Image.new('1', (size * SS, size * SS), 0)
    # even-odd: each contour flips what it covers, so a contour inside another is a hole
    for contour in flatten(pen.value, scale, dx, dy):
        layer = Image.new('1', mask.size, 0)
        ImageDraw.Draw(layer).polygon(contour, fill=1)
        mask = ImageChops.logical_xor(mask, layer)
    return mask.convert('L').resize((size, size), Image.LANCZOS)


def gradient(size):
    image = Image.new('RGB', (size, size))
    px = image.load()
    for y in range(size):
        for x in range(size):
            t = (x + y) / (2 * (size - 1))
            px[x, y] = tuple(round(a + (b - a) * t) for a, b in zip(TOP, BOTTOM))
    return image


def icon(size, *, rounded, fraction=0.62, transparent_bg=False):
    """The logo at [size]: the gradient (rounded like the SVG's 8/32 radius, or square) with the rocket on it."""
    base = Image.new('RGBA', (size, size), (0, 0, 0, 0)) if transparent_bg else gradient(size).convert('RGBA')
    white = Image.new('RGBA', (size, size), (255, 255, 255, 255))
    base.paste(white, (0, 0), rocket_mask(size, fraction))
    if rounded:
        mask = Image.new('L', (size * SS, size * SS), 0)
        ImageDraw.Draw(mask).rounded_rectangle((0, 0, size * SS - 1, size * SS - 1), radius=size * SS // 4, fill=255)
        out = Image.new('RGBA', (size, size), (0, 0, 0, 0))
        out.paste(base, (0, 0), mask.resize((size, size), Image.LANCZOS))
        return out
    return base


def save(image, path, flat=False):
    path.parent.mkdir(parents=True, exist_ok=True)
    (image.convert('RGB') if flat else image).save(path)


# Android: legacy launcher icons (rounded) and the adaptive icon's foreground (the rocket alone, inside the 66 % safe zone)
for folder, px in (('mdpi', 48), ('hdpi', 72), ('xhdpi', 96), ('xxhdpi', 144), ('xxxhdpi', 192)):
    save(icon(px, rounded=True), ROOT / f'android/app/src/main/res/mipmap-{folder}/ic_launcher.png')
save(icon(432, rounded=False, fraction=0.40, transparent_bg=True), ROOT / 'android/app/src/main/res/drawable-nodpi/ic_launcher_foreground.png')

# iOS: opaque squares (the system rounds them)
contents = json.loads((ROOT / 'ios/Runner/Assets.xcassets/AppIcon.appiconset/Contents.json').read_text())
for entry in contents['images']:
    size = float(entry['size'].split('x')[0]) * int(entry['scale'].rstrip('x'))
    save(icon(round(size), rounded=False), ROOT / 'ios/Runner/Assets.xcassets/AppIcon.appiconset' / entry['filename'], flat=True)

# iOS launch image: the rocket alone, centered on the storyboard's dark background (168 x 185 points, 1x to 3x)
for scale, suffix in ((1, ''), (2, '@2x'), (3, '@3x')):
    w, h = 168 * scale, 185 * scale
    canvas = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    rocket = Image.new('RGBA', (h, h), (255, 255, 255, 255))
    rocket.putalpha(rocket_mask(h, 0.7))
    canvas.paste(rocket.crop(((h - w) // 2, 0, (h - w) // 2 + w, h)), (0, 0))
    save(canvas, ROOT / f'ios/Runner/Assets.xcassets/LaunchImage.imageset/LaunchImage{suffix}.png')
print('done')
