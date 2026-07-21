from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageOps


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "games" / "lutheran-idle" / "public" / "assets"
ART_SOURCE = ROOT / "games" / "lutheran-idle" / "art-source"
RAW = ART_SOURCE / "raw"
GENERATED = ART_SOURCE / "generated"
OUT = SOURCE / "game"


def crop_cell(image: Image.Image, col: int, row: int, cols: int, rows: int) -> Image.Image:
    left = round(image.width * col / cols)
    top = round(image.height * row / rows)
    right = round(image.width * (col + 1) / cols)
    bottom = round(image.height * (row + 1) / rows)
    return image.crop((left, top, right, bottom))


def trim_alpha(image: Image.Image, padding: int = 8) -> Image.Image:
    image = image.convert("RGBA")
    bbox = image.getchannel("A").getbbox()
    if not bbox:
        raise ValueError("Asset cell has no visible pixels")
    return ImageOps.expand(image.crop(bbox), border=padding, fill=(0, 0, 0, 0))


def fit_on_canvas(image: Image.Image, size: tuple[int, int], max_height: int) -> Image.Image:
    image = trim_alpha(image, 4)
    scale = min((size[0] - 12) / image.width, max_height / image.height)
    resized = image.resize((max(1, round(image.width * scale)), max(1, round(image.height * scale))), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", size, (0, 0, 0, 0))
    x = (size[0] - resized.width) // 2
    y = size[1] - resized.height - 4
    canvas.alpha_composite(resized, (x, y))
    return canvas


def process_stations() -> dict[str, str]:
    atlas = Image.open(GENERATED / "stations_atlas.png").convert("RGBA")
    names = [
        "pulpit_l1", "pulpit_l2", "pulpit_l3",
        "benches_l1", "benches_l2", "benches_l3",
        "altar_l1", "reception_l1", "catechesis_l1",
    ]
    result: dict[str, str] = {}
    for index, name in enumerate(names):
        cell = trim_alpha(crop_cell(atlas, index % 3, index // 3, 3, 3), 12)
        path = OUT / f"station_{name}.png"
        cell.save(path, optimize=True)
        result[name] = f"assets/game/{path.name}"
    return result


def process_characters() -> dict[str, object]:
    atlas = Image.open(GENERATED / "characters_atlas.png").convert("RGBA")
    frame_size = (192, 240)
    result: dict[str, object] = {"frameWidth": frame_size[0], "frameHeight": frame_size[1]}
    source_columns = (0, 1, 2, 1)
    for row, name in enumerate(("visitor", "pastor")):
        strip = Image.new("RGBA", (frame_size[0] * 4, frame_size[1]), (0, 0, 0, 0))
        for output_col, source_col in enumerate(source_columns):
            frame = fit_on_canvas(crop_cell(atlas, source_col, row, 4, 2), frame_size, 220)
            strip.alpha_composite(frame, (output_col * frame_size[0], 0))
        path = OUT / f"worker_{name}_walk.png"
        strip.save(path, optimize=True)
        result[name] = f"assets/game/{path.name}"
    return result


def process_ui() -> dict[str, str]:
    atlas = Image.open(GENERATED / "ui_atlas.png").convert("RGBA")
    names = ["frame_wood", "button_primary", "icon_offerings", "icon_members"]
    result: dict[str, str] = {}
    for index, name in enumerate(names):
        cell = trim_alpha(crop_cell(atlas, index % 2, index // 2, 2, 2), 10)
        path = OUT / f"ui_{name}.png"
        cell.save(path, optimize=True)
        result[name] = f"assets/game/{path.name}"
    return result


def process_large_art() -> dict[str, str]:
    background = Image.open(GENERATED / "room_stage_01_background.png").convert("RGB")
    background = ImageOps.fit(background, (768, 1365), Image.Resampling.LANCZOS, centering=(0.5, 0.5))
    background_path = OUT / "room_stage_01_background.webp"
    background.save(background_path, "WEBP", quality=90, method=6)

    banner = Image.open(GENERATED / "banner_lutheran_idle.png").convert("RGB")
    banner = ImageOps.fit(banner, (1536, 512), Image.Resampling.LANCZOS, centering=(0.5, 0.5))
    banner_path = OUT / "banner_lutheran_idle.webp"
    banner.save(banner_path, "WEBP", quality=90, method=6)

    icon = ImageOps.fit(background, (512, 512), Image.Resampling.LANCZOS, centering=(0.5, 0.18))
    icon_path = OUT / "app_icon_lutheran_idle.png"
    icon.save(icon_path, optimize=True)

    return {
        "background": f"assets/game/{background_path.name}",
        "banner": f"assets/game/{banner_path.name}",
        "icon": f"assets/game/{icon_path.name}",
    }


def validate_alpha(path: Path) -> None:
    image = Image.open(path).convert("RGBA")
    alpha = image.getchannel("A")
    corners = [alpha.getpixel((0, 0)), alpha.getpixel((image.width - 1, 0)), alpha.getpixel((0, image.height - 1)), alpha.getpixel((image.width - 1, image.height - 1))]
    if max(corners) != 0:
        raise ValueError(f"Transparent asset has opaque corner: {path.name}: {corners}")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    manifest = {
        "version": 1,
        "large": process_large_art(),
        "stations": process_stations(),
        "characters": process_characters(),
        "ui": process_ui(),
    }
    for path in OUT.glob("*.png"):
        if path.name != "app_icon_lutheran_idle.png":
            validate_alpha(path)
    (OUT / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(manifest, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
