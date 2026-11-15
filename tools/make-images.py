#!/usr/bin/env python3
"""Draws the share image and the icons from the brand: og.png (1200x630), icon-512.png,
icon-192.png, apple-touch-icon.png (180x180) and favicon.svg.

    python3 tools/make-images.py [path to Geist .ttf/.woff2] [path to Geist Mono .ttf/.woff2]

Needs Pillow. The name comes from site.config.json. Without font paths it uses fonts/ in this
site (Pillow can read the .woff2 files when FreeType has Brotli) and falls back to Inter or DejaVu Sans.
"""
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
NAME = json.loads((ROOT / "site.config.json").read_text())["siteName"]
LINE = "Websites and mobile apps, priced block by block."
SERVICES = ["Web design", "Development", "SEO · AEO · GEO", "Mobile apps"]

BLACK = (0, 0, 0)
WHITE = (242, 242, 242)
BLUE = (89, 165, 245)  # oklch(0.72 0.15 250)
GREY = (166, 166, 166)
LINE_GREY = (38, 38, 38)


def font(size, weight, mono=False):
    given = sys.argv[2:3] if mono else sys.argv[1:2]
    own = ROOT / "fonts" / ("geist-mono-latin-wght-normal.woff2" if mono else "geist-latin-wght-normal.woff2")
    fallbacks = [
        "/usr/share/fonts/opentype/inter/Inter-SemiBold.otf" if weight >= 600 else "/usr/share/fonts/opentype/inter/Inter-Regular.otf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if weight >= 600 else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ]
    for candidate in [*given, str(own), *fallbacks]:
        try:
            loaded = ImageFont.truetype(candidate, size)
        except OSError:
            continue
        try:
            loaded.set_variation_by_axes([weight])
        except OSError:
            pass  # not a variable font
        return loaded
    return ImageFont.load_default(size)


def mark(draw, x, y, cell, gap, radius):
    """The four-square logo: white, blue / blue, white."""
    for index, color in enumerate([WHITE, BLUE, BLUE, WHITE]):
        left = x + (index % 2) * (cell + gap)
        top = y + (index // 2) * (cell + gap)
        draw.rounded_rectangle([left, top, left + cell, top + cell], radius=radius, fill=color)


def share_image():
    scale = 2  # draw large, then shrink for smooth edges
    width, height = 1200 * scale, 630 * scale
    image = Image.new("RGB", (width, height), BLACK)
    draw = ImageDraw.Draw(image)

    # The faint grid from the site's hero, fading out towards the bottom.
    step = 56 * scale
    for x in range(0, width, step):
        draw.line([(x, 0), (x, height)], fill=LINE_GREY, width=scale)
    for y in range(0, height, step):
        draw.line([(0, y), (width, y)], fill=LINE_GREY, width=scale)
    fade = Image.linear_gradient("L").resize((width, height))  # black at the top, white at the bottom
    image = Image.composite(Image.new("RGB", (width, height), BLACK), image, fade)
    draw = ImageDraw.Draw(image)

    left = 88 * scale
    mark(draw, left, 96 * scale, 34 * scale, 8 * scale, 8 * scale)
    draw.text((left + 100 * scale, 134 * scale), NAME, font=font(52 * scale, 600), fill=WHITE, anchor="lm")

    headline = font(76 * scale, 600)
    draw.text((left, 258 * scale), "Websites and mobile apps,", font=headline, fill=WHITE)
    first = "priced "
    draw.text((left, 350 * scale), first, font=headline, fill=WHITE)
    draw.text((left + draw.textlength(first, font=headline), 350 * scale), "block by block.", font=headline, fill=BLUE)

    chip_font = font(24 * scale, 400, mono=True)
    x = left
    for label in SERVICES:
        text_width = draw.textlength(label, font=chip_font)
        box = [x, 506 * scale, x + text_width + 44 * scale, 558 * scale]
        draw.rounded_rectangle(box, radius=26 * scale, outline=(70, 70, 70), width=scale, fill=BLACK)
        draw.text((x + 22 * scale, 532 * scale), label, font=chip_font, fill=GREY, anchor="lm")
        x = box[2] + 14 * scale

    image.resize((1200, 630), Image.LANCZOS).save(ROOT / "og.png", optimize=True)


def icon(size, name):
    scale = 4
    side = size * scale
    image = Image.new("RGB", (side, side), BLACK)
    draw = ImageDraw.Draw(image)
    cell = side * 0.25
    gap = side * 0.0625
    start = (side - (2 * cell + gap)) / 2
    mark(draw, start, start, cell, gap, side * 0.0625)
    image.resize((size, size), Image.LANCZOS).save(ROOT / name, optimize=True)


FAVICON = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="7"/><rect x="7" y="7" width="8" height="8" rx="2" fill="#f2f2f2"/><rect x="17" y="7" width="8" height="8" rx="2" fill="#59a5f5"/><rect x="7" y="17" width="8" height="8" rx="2" fill="#59a5f5"/><rect x="17" y="17" width="8" height="8" rx="2" fill="#f2f2f2"/></svg>
"""

share_image()
icon(512, "icon-512.png")
icon(192, "icon-192.png")
icon(180, "apple-touch-icon.png")
(ROOT / "favicon.svg").write_text(FAVICON)
print("Wrote og.png, icon-512.png, icon-192.png, apple-touch-icon.png and favicon.svg")
