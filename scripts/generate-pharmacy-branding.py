#!/usr/bin/env python3
"""Generate Finvoroo Pharmacy POS icons + NSIS installer artwork from the product logo."""

from __future__ import annotations

import json
import struct
import zlib
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
TAURI = ROOT / "src-tauri"
ICONS = TAURI / "icons"
WINDOWS = TAURI / "windows"
BRANDING = ROOT / "branding"
SOURCE = BRANDING / "pharmacy-pos-logo.png"
WEB_LOGO = ROOT / "React-frontend" / "public" / "media" / "images" / "finvoroopharmacy.png"
CONF = json.loads((TAURI / "tauri.conf.json").read_text(encoding="utf-8"))
VERSION = CONF.get("version", "0.0.0")
PRODUCT = CONF.get("productName", "Finvoroo Pharmacy POS")

BLUE = (30, 64, 175)
GREEN = (5, 150, 105)
WHITE = (255, 255, 255)
SLATE = (100, 116, 139)
PANEL_TOP = (15, 23, 42)


def load_logo() -> Image.Image:
    if not SOURCE.exists():
        raise SystemExit(f"Missing logo: {SOURCE}")
    return Image.open(SOURCE).convert("RGBA")


def crop_mark(logo: Image.Image) -> Image.Image:
    """Square crop of the cross icon on the left of the wide logo."""
    w, h = logo.size
    side = min(h, w)
    return logo.crop((0, 0, side, side))


def load_icon_mark(banner: Image.Image) -> Image.Image:
    """App/taskbar icon — use the square web logo; do not overwrite that file."""
    if WEB_LOGO.exists():
        return Image.open(WEB_LOGO).convert("RGBA")
    return crop_mark(banner)


def save_png(img: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, format="PNG", optimize=True)


def png_to_ico(png_path: Path, ico_path: Path) -> None:
    png = png_path.read_bytes()
    size = Image.open(png_path).size[0]
    dim = 0 if size >= 256 else size
    header = struct.pack("<HHH", 0, 1, 1)
    entry = struct.pack("<BBBBHHII", dim, dim, 0, 0, 1, 32, len(png), 6 + 16)
    ico_path.write_bytes(header + entry + png)


def rounded_panel(size: tuple[int, int], top: tuple[int, int, int], bottom: tuple[int, int, int]) -> Image.Image:
    img = Image.new("RGB", size, top)
    draw = ImageDraw.Draw(img)
    for y in range(size[1]):
        t = y / max(size[1] - 1, 1)
        color = tuple(int(top[i] + (bottom[i] - top[i]) * t) for i in range(3))
        draw.line([(0, y), (size[0], y)], fill=color)
    return img


def fit_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
        "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/Library/Fonts/Arial.ttf",
        "C:/Windows/Fonts/segoeuib.ttf",
        "C:/Windows/Fonts/arialbd.ttf",
    ]
    for path in candidates:
        if Path(path).exists():
            return ImageFont.truetype(path, size=size)
    return ImageFont.load_default()


def paste_center(base: Image.Image, overlay: Image.Image, box: tuple[int, int, int, int]) -> None:
    ow, oh = overlay.size
    x0, y0, x1, y1 = box
    target_w, target_h = x1 - x0, y1 - y0
    scale = min(target_w / ow, target_h / oh)
    nw, nh = max(1, int(ow * scale)), max(1, int(oh * scale))
    resized = overlay.resize((nw, nh), Image.Resampling.LANCZOS)
    px = x0 + (target_w - nw) // 2
    py = y0 + (target_h - nh) // 2
    base.paste(resized, (px, py), resized)


def draw_sidebar(mark: Image.Image) -> Image.Image:
    img = rounded_panel((164, 314), BLUE, GREEN)
    draw = ImageDraw.Draw(img)

    paste_center(img, mark, (22, 36, 142, 156))

    title_font = fit_font(15)
    sub_font = fit_font(10)
    ver_font = fit_font(11)
    tag_font = fit_font(8)

    draw.text((82, 178), "Finvoroo", fill=WHITE, font=title_font, anchor="mm")
    draw.text((82, 198), "Pharmacy POS", fill=(167, 243, 208), font=sub_font, anchor="mm")
    draw.text((82, 224), f"Version {VERSION}", fill=WHITE, font=ver_font, anchor="mm")
    draw.text((82, 248), "COUNTER SALE · SMART DISPENSING", fill=(226, 232, 240), font=tag_font, anchor="mm")
    draw.text((82, 286), "finvoroo.com", fill=(226, 232, 240), font=tag_font, anchor="mm")
    return img


def draw_header(mark: Image.Image, banner: Image.Image) -> Image.Image:
    img = Image.new("RGB", (150, 57), WHITE)
    draw = ImageDraw.Draw(img)
    draw.rectangle([(0, 0), (149, 56)], outline=(226, 232, 240))

    paste_center(img, mark, (6, 6, 52, 51))

    # Compact wordmark from the wide logo on the right side of the header strip.
    paste_center(img, banner, (54, 8, 144, 49))

    draw.text((54, 46), f"v{VERSION}", fill=SLATE, font=fit_font(9))
    return img


def main() -> None:
    logo = load_logo()
    mark = load_icon_mark(logo)
    banner = logo.crop((crop_mark(logo).size[0] + 8, 0, logo.size[0], logo.size[1]))

    ICONS.mkdir(parents=True, exist_ok=True)
    WINDOWS.mkdir(parents=True, exist_ok=True)

    for size, name in [(32, "32x32.png"), (128, "128x128.png"), (256, "icon.png")]:
        out = mark.resize((size, size), Image.Resampling.LANCZOS)
        save_png(out, ICONS / name)

    png_to_ico(ICONS / "icon.png", ICONS / "icon.ico")

    sidebar = draw_sidebar(mark)
    header = draw_header(mark, banner)
    sidebar.save(WINDOWS / "installer-sidebar.bmp", format="BMP")
    header.save(WINDOWS / "installer-header.bmp", format="BMP")

    print(f"Branding generated for {PRODUCT} v{VERSION}")
    print(f"  icons -> {ICONS}")
    print(f"  installer art -> {WINDOWS}")


if __name__ == "__main__":
    main()
