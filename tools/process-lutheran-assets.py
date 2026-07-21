from __future__ import annotations

import json
from collections import deque
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


def keep_largest_alpha_component(image: Image.Image) -> Image.Image:
    image = image.convert("RGBA")
    alpha = image.getchannel("A")
    visible = alpha.point(lambda value: 255 if value > 8 else 0)
    pixels = visible.load()
    visited: set[tuple[int, int]] = set()
    components: list[list[tuple[int, int]]] = []
    for y in range(image.height):
        for x in range(image.width):
            if not pixels[x, y] or (x, y) in visited:
                continue
            component: list[tuple[int, int]] = []
            queue = deque([(x, y)])
            visited.add((x, y))
            while queue:
                current_x, current_y = queue.popleft()
                component.append((current_x, current_y))
                for next_x, next_y in ((current_x - 1, current_y), (current_x + 1, current_y), (current_x, current_y - 1), (current_x, current_y + 1)):
                    if 0 <= next_x < image.width and 0 <= next_y < image.height and pixels[next_x, next_y] and (next_x, next_y) not in visited:
                        visited.add((next_x, next_y))
                        queue.append((next_x, next_y))
            components.append(component)
    if not components:
        return image
    keep = set(max(components, key=len))
    output = image.copy()
    output_alpha = output.getchannel("A")
    output_pixels = output_alpha.load()
    for y in range(image.height):
        for x in range(image.width):
            if (x, y) not in keep:
                output_pixels[x, y] = 0
    output.putalpha(output_alpha)
    return output


def process_stations() -> dict[str, str]:
    atlas = Image.open(GENERATED / "stations_atlas.png").convert("RGBA")
    cells = [
        (0, "pulpit_l1"), (1, "pulpit_l2"), (2, "pulpit_l3"),
        (6, "altar_l1"), (7, "reception_l1"), (8, "catechesis_l1"),
    ]
    result: dict[str, str] = {}
    for index, name in cells:
        raw_cell = crop_cell(atlas, index % 3, index // 3, 3, 3)
        if name == "altar_l1":
            raw_cell = raw_cell.crop((0, 0, round(raw_cell.width * 0.93), raw_cell.height))
        cell = trim_alpha(raw_cell, 12)
        path = OUT / f"station_{name}.png"
        cell.save(path, optimize=True)
        result[name] = f"assets/game/{path.name}"
    result.update(process_benches())
    return result


def process_benches() -> dict[str, str]:
    atlas = Image.open(GENERATED / "benches_rear_atlas.png").convert("RGBA")
    result: dict[str, str] = {}
    for index, name in enumerate(("benches_l1", "benches_l2", "benches_l3")):
        cell = fit_on_canvas(crop_cell(atlas, index, 0, 3, 1), (420, 340), 316)
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


def process_navigation_icons() -> dict[str, str]:
    atlas = Image.open(GENERATED / "ui_navigation_atlas.png").convert("RGBA")
    names = ["profile", "missions", "offline", "district", "church", "build", "team", "members", "menu", "offerings"]
    result: dict[str, str] = {}
    for index, name in enumerate(names):
        raw_cell = crop_cell(atlas, index % 5, index // 5, 5, 2)
        if name == "menu":
            raw_cell = raw_cell.crop((0, 0, round(raw_cell.width * 0.9), raw_cell.height))
        else:
            raw_cell = keep_largest_alpha_component(raw_cell)
        cell = trim_alpha(raw_cell, 5)
        scale = min(112 / cell.width, 112 / cell.height)
        resized = cell.resize((max(1, round(cell.width * scale)), max(1, round(cell.height * scale))), Image.Resampling.LANCZOS)
        icon = Image.new("RGBA", (128, 128), (0, 0, 0, 0))
        icon.alpha_composite(resized, ((128 - resized.width) // 2, (128 - resized.height) // 2))
        path = OUT / f"ui_nav_{name}.png"
        icon.save(path, optimize=True)
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
        "ui": {**process_ui(), **process_navigation_icons()},
    }
    for path in OUT.glob("*.png"):
        if path.name != "app_icon_lutheran_idle.png":
            validate_alpha(path)
    (OUT / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(manifest, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
