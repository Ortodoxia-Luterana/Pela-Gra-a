from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageChops


ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public" / "babel" / "assets"
SOURCE = PUBLIC / "characters" / "armor" / "source"
ARMOR = PUBLIC / "characters" / "armor"
EQUIPMENT = PUBLIC / "characters" / "equipment"

SETS = ("ranger", "forest", "crystal", "tower", "dawn", "abyss", "frost", "desert")
BODIES = ("male", "female")
SLOTS = ("helmet", "armor", "pants", "boots")

# Overlap is intentional: adjoining pieces meet without transparent seams while
# still remaining independently equipable. The same source pixels are used in
# each overlap, so a complete matching set remains visually seamless.
BANDS = {
    "helmet": (0, 0, 106, 136),
    "armor": (76, 94, 184, 204),
    "pants": (158, 176, 224, 240),
    "boots": (204, 220, 256, 256),
}


def split_cells(source: Image.Image) -> list[Image.Image]:
    width, height = source.size
    cells: list[Image.Image] = []
    for row in range(2):
        top = round(row * height / 2)
        bottom = round((row + 1) * height / 2)
        for column in range(4):
            left = round(column * width / 4)
            right = round((column + 1) * width / 4)
            cells.append(source.crop((left, top, right, bottom)))
    return cells


def normalized_rows(source: Image.Image) -> tuple[Image.Image, Image.Image]:
    cells = split_cells(source.convert("RGBA"))
    cropped: list[Image.Image] = []
    sizes: list[tuple[int, int]] = []
    for cell in cells:
        alpha = cell.getchannel("A")
        bbox = alpha.point(lambda value: 255 if value > 18 else 0).getbbox()
        if not bbox:
            raise RuntimeError("Sprite cell is empty after chroma removal")
        crop = cell.crop(bbox)
        cropped.append(crop)
        sizes.append(crop.size)

    scale = min(226 / max(width for width, _ in sizes), 232 / max(height for _, height in sizes))
    rows: list[Image.Image] = []
    for row in range(2):
        sheet = Image.new("RGBA", (1024, 256), (0, 0, 0, 0))
        for column in range(4):
            sprite = cropped[row * 4 + column]
            width = max(1, round(sprite.width * scale))
            height = max(1, round(sprite.height * scale))
            sprite = sprite.resize((width, height), Image.Resampling.LANCZOS)
            x = column * 256 + (256 - width) // 2
            y = 248 - height
            sheet.alpha_composite(sprite, (x, y))
        rows.append(sheet)
    return rows[0], rows[1]


def band_mask(slot: str) -> Image.Image:
    start, full_start, full_end, end = BANDS[slot]
    mask = Image.new("L", (1024, 256), 0)
    pixels = mask.load()
    for y in range(256):
        if y < start or y >= end:
            value = 0
        elif y < full_start:
            value = round(255 * (y - start) / max(1, full_start - start))
        elif y <= full_end:
            value = 255
        else:
            value = round(255 * (end - y) / max(1, end - full_end))
        for x in range(1024):
            pixels[x, y] = max(0, min(255, value))
    return mask


def extract_layer(sheet: Image.Image, slot: str) -> Image.Image:
    layer = sheet.copy()
    alpha = layer.getchannel("A")
    mask = band_mask(slot)
    multiplied = ImageChops.multiply(alpha, mask)
    layer.putalpha(multiplied)
    return layer


def save_icon(layer: Image.Image, destination: Path) -> None:
    front = layer.crop((0, 0, 256, 256))
    bbox = front.getchannel("A").point(lambda value: 255 if value > 18 else 0).getbbox()
    if not bbox:
        raise RuntimeError(f"Cannot build empty icon: {destination}")
    cropped = front.crop(bbox)
    scale = min(208 / cropped.width, 208 / cropped.height)
    size = (max(1, round(cropped.width * scale)), max(1, round(cropped.height * scale)))
    cropped = cropped.resize(size, Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (256, 256), (0, 0, 0, 0))
    canvas.alpha_composite(cropped, ((256 - size[0]) // 2, (256 - size[1]) // 2))
    destination.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(destination, optimize=True)


def validate_sheet(path: Path) -> None:
    image = Image.open(path).convert("RGBA")
    if image.size != (1024, 256):
        raise RuntimeError(f"Invalid sheet dimensions for {path}: {image.size}")
    for frame in range(4):
        alpha = image.crop((frame * 256, 0, (frame + 1) * 256, 256)).getchannel("A")
        if not alpha.point(lambda value: 255 if value > 18 else 0).getbbox():
            raise RuntimeError(f"Empty frame {frame} in {path}")


def main() -> None:
    built: list[Path] = []
    for set_id in SETS:
        for body in BODIES:
            source_path = SOURCE / f"{set_id}-{body}-atlas-alpha-v1.png"
            main_sheet, walk_sheet = normalized_rows(Image.open(source_path))

            full_path = ARMOR / f"{set_id}-{body}.png"
            walk_path = ARMOR / f"{set_id}-{body}-walk.png"
            main_sheet.save(full_path, optimize=True)
            walk_sheet.save(walk_path, optimize=True)
            built.extend((full_path, walk_path))

            for slot in SLOTS:
                slot_dir = EQUIPMENT / set_id / body
                slot_dir.mkdir(parents=True, exist_ok=True)
                main_layer = extract_layer(main_sheet, slot)
                walk_layer = extract_layer(walk_sheet, slot)
                part_path = slot_dir / f"{slot}.png"
                part_walk_path = slot_dir / f"{slot}-walk.png"
                main_layer.save(part_path, optimize=True)
                walk_layer.save(part_walk_path, optimize=True)
                built.extend((part_path, part_walk_path))

                if body == "male" and slot == "pants":
                    inventory_dir = "armor" if set_id in SETS[:4] else "armor-exotic"
                    save_icon(main_layer, PUBLIC / "items" / inventory_dir / f"{set_id}-pants.png")

    for path in built:
        validate_sheet(path)
    print(f"Built and validated {len(built)} sprite sheets for {len(SETS)} equipment sets.")


if __name__ == "__main__":
    main()
