from __future__ import annotations

import json
import struct
import sys
from pathlib import Path

from PIL import Image


ROM_DEFAULT = Path(r"C:\Users\TETZNER\Downloads\PK EMR (PT-BR).bak")
OUT_DIR = Path(__file__).resolve().parents[1] / "public"
MAPS_INI = Path(
    r"C:\Users\TETZNER\Desktop\Rom Hack Ferramentas\Rom Hack Ferramentas\Advance Map 1.95\Ini\Maps.ini"
)

POINTER_TO_MAP_BANKS = 0x84AA4
OBJECT_GFX_POINTERS = 0x505620
OBJECT_PALETTES = 0x50BBC8
OBJECT_GFX_COUNT = 253
BANK_COUNTS = [
    56, 4, 6, 2, 3, 2, 16, 6, 4, 2, 2, 1, 1, 1, 2, 1, 1,
    1, 1, 1, 1, 4, 3, 1, 108, 44, 10, 12, 53, 1, 7, 2, 1, 13,
]
SELECTED_MAPS = (
    [(0, i) for i in range(BANK_COUNTS[0])]
    + [(1, i) for i in range(BANK_COUNTS[1])]
    + [(2, i) for i in range(BANK_COUNTS[2])]
    + [(3, i) for i in range(BANK_COUNTS[3])]
    + [(25, 40)]  # IM MOBELWAGEN
)

DISPLAY_NAMES = {
    "IM MÖBELWAGEN": "Caminhao de Mudanca",
    "IM MOBELWAGEN": "Caminhao de Mudanca",
    "WURZELHEIM": "Vila Raiz",
    "ROUTE 101": "Rota 101",
    "ROUTE 102": "Rota 102",
    "ROSALTSTADT": "Rosaltstadt",
}
DISPLAY_NAMES_BY_ID = {
    (25, 40): "Caminhao de Mudanca",
    (0, 9): "Vila Raiz",
    (0, 16): "Rota 101",
    (0, 17): "Rota 102",
}


def u8(rom: bytes, offset: int) -> int:
    return rom[offset]


def s16(rom: bytes, offset: int) -> int:
    return struct.unpack_from("<h", rom, offset)[0]


def u16(rom: bytes, offset: int) -> int:
    return struct.unpack_from("<H", rom, offset)[0]


def u32(rom: bytes, offset: int) -> int:
    return struct.unpack_from("<I", rom, offset)[0]


def s32(rom: bytes, offset: int) -> int:
    return struct.unpack_from("<i", rom, offset)[0]


def ptr(rom: bytes, offset: int) -> int:
    value = u32(rom, offset)
    if 0x08000000 <= value < 0x0A000000:
        return value - 0x08000000
    return value


def safe_ptr(rom: bytes, offset: int) -> int | None:
    if offset < 0 or offset + 4 > len(rom):
        return None
    value = ptr(rom, offset)
    if 0 <= value < len(rom):
        return value
    return None


def lz77(rom: bytes, offset: int) -> bytes:
    if rom[offset] != 0x10:
        raise ValueError(f"expected GBA LZ77 at {offset:x}")
    length = rom[offset + 1] | (rom[offset + 2] << 8) | (rom[offset + 3] << 16)
    src = offset + 4
    out = bytearray()
    while len(out) < length:
        flags = rom[src]
        src += 1
        for bit in range(7, -1, -1):
            if len(out) >= length:
                break
            if flags & (1 << bit):
                b1, b2 = rom[src], rom[src + 1]
                src += 2
                count = (b1 >> 4) + 3
                disp = ((b1 & 0xF) << 8) | b2
                src_pos = len(out) - disp - 1
                for _ in range(count):
                    out.append(out[src_pos])
                    src_pos += 1
            else:
                out.append(rom[src])
                src += 1
    return bytes(out)


def gba_color(raw: int) -> tuple[int, int, int, int]:
    r = (raw & 0x1F) * 255 // 31
    g = ((raw >> 5) & 0x1F) * 255 // 31
    b = ((raw >> 10) & 0x1F) * 255 // 31
    return r, g, b, 255


def read_names() -> dict[tuple[int, int], str]:
    names: dict[tuple[int, int], str] = {}
    if not MAPS_INI.exists():
        return names
    current: tuple[int, int] | None = None
    for raw in MAPS_INI.read_text(encoding="latin-1", errors="ignore").splitlines():
        line = raw.strip()
        if line.startswith("[") and line.endswith("]") and "." in line:
            parts = line[1:-1].split(".", 1)
            if parts[0].isdigit() and parts[1].isdigit():
                current = (int(parts[0]), int(parts[1]))
            else:
                current = None
        elif current and line.startswith("Name="):
            names[current] = line.split("=", 1)[1].strip()
    return names


def decode_tiles(raw: bytes) -> list[list[int]]:
    tiles: list[list[int]] = []
    for offset in range(0, len(raw) - 31, 32):
        pixels: list[int] = []
        for b in raw[offset : offset + 32]:
            pixels.append(b & 0xF)
            pixels.append((b >> 4) & 0xF)
        tiles.append(pixels)
    return tiles


class Tileset:
    def __init__(self, rom: bytes, offset: int):
        self.offset = offset
        self.tiles_ptr = ptr(rom, offset + 4)
        self.palette_ptr = ptr(rom, offset + 8)
        self.metatiles_ptr = ptr(rom, offset + 12)
        self.attrs_ptr = ptr(rom, offset + 16)
        self.tiles = decode_tiles(lz77(rom, self.tiles_ptr))
        self.palette = [gba_color(u16(rom, self.palette_ptr + i * 2)) for i in range(256)]


def draw_entry(img: Image.Image, x: int, y: int, entry: int, primary: Tileset, secondary: Tileset, overlay: bool) -> None:
    tile_no = entry & 0x3FF
    hflip = bool(entry & 0x400)
    vflip = bool(entry & 0x800)
    pal = (entry >> 12) & 0xF
    source = secondary if tile_no >= 512 else primary
    tile_index = tile_no - 512 if tile_no >= 512 else tile_no
    if tile_index < 0 or tile_index >= len(source.tiles):
        return
    pixels = source.tiles[tile_index]
    for py in range(8):
        for px in range(8):
            sx = 7 - px if hflip else px
            sy = 7 - py if vflip else py
            color_index = pixels[sy * 8 + sx]
            if overlay and color_index == 0:
                continue
            img.putpixel((x + px, y + py), source.palette[pal * 16 + color_index])


def draw_metatile(rom: bytes, img: Image.Image, dst_x: int, dst_y: int, metatile: int, primary: Tileset, secondary: Tileset) -> None:
    local_id = metatile if metatile < 512 else metatile - 512
    source = primary if metatile < 512 else secondary
    base = source.metatiles_ptr + local_id * 16
    if base < 0 or base + 16 > len(rom):
        return
    positions = [(0, 0), (8, 0), (0, 8), (8, 8)]
    for layer in range(2):
        for i, (px, py) in enumerate(positions):
            entry = u16(rom, base + (layer * 4 + i) * 2)
            draw_entry(img, dst_x + px, dst_y + py, entry, primary, secondary, overlay=layer > 0)


def read_object_palettes(rom: bytes) -> dict[int, list[tuple[int, int, int, int]]]:
    palettes: dict[int, list[tuple[int, int, int, int]]] = {}
    for i in range(32):
        pal_ptr = ptr(rom, OBJECT_PALETTES + i * 8)
        tag = u16(rom, OBJECT_PALETTES + i * 8 + 4)
        if 0 <= pal_ptr < len(rom) - 32:
            palettes[tag] = [gba_color(u16(rom, pal_ptr + j * 2)) for j in range(16)]
    return palettes


def draw_4bpp_frame(data: bytes, width: int, height: int, palette: list[tuple[int, int, int, int]]) -> Image.Image:
    img = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    tiles_x = max(1, width // 8)
    for tile_index in range(min(len(data) // 32, (width // 8) * (height // 8))):
        tx = (tile_index % tiles_x) * 8
        ty = (tile_index // tiles_x) * 8
        for byte_index, byte in enumerate(data[tile_index * 32 : tile_index * 32 + 32]):
            px = (byte_index * 2) % 8
            py = (byte_index * 2) // 8
            for nibble, color_index in enumerate((byte & 0xF, byte >> 4)):
                if color_index:
                    img.putpixel((tx + px + nibble, ty + py), palette[color_index])
    return img


def read_object_frame(rom: bytes, palettes: dict[int, list[tuple[int, int, int, int]]], graphics_id: int, frame: int = 0) -> Image.Image | None:
    info_ptr = ptr(rom, OBJECT_GFX_POINTERS + graphics_id * 4)
    if not (0 <= info_ptr < len(rom) - 36):
        return None
    palette_tag = u16(rom, info_ptr + 2)
    width = u16(rom, info_ptr + 8)
    height = u16(rom, info_ptr + 10)
    images_ptr = ptr(rom, info_ptr + 28)
    if palette_tag not in palettes or not (0 <= images_ptr < len(rom) - 8):
        return None
    frame_ptr = ptr(rom, images_ptr + frame * 8)
    frame_size = u32(rom, images_ptr + frame * 8 + 4)
    if not (0 <= frame_ptr < len(rom)) or frame_size <= 0:
        return None
    return draw_4bpp_frame(rom[frame_ptr : frame_ptr + frame_size], width, height, palettes[palette_tag])


def make_overworld_sprites(rom: bytes, player_path: Path, object_path: Path) -> None:
    palettes = read_object_palettes(rom)
    player_graphics_id = 1
    player_frames: list[Image.Image] = []
    for frame in range(8):
        img = read_object_frame(rom, palettes, player_graphics_id, frame)
        if img:
            player_frames.append(img)
    frame_w = max((img.width for img in player_frames), default=32)
    frame_h = max((img.height for img in player_frames), default=32)
    player_sheet = Image.new("RGBA", (frame_w * len(player_frames), frame_h), (0, 0, 0, 0))
    for i, img in enumerate(player_frames):
        player_sheet.alpha_composite(img, (i * frame_w + (frame_w - img.width) // 2, frame_h - img.height))
    player_sheet.save(player_path)

    cell = 48
    columns = 16
    rows = (OBJECT_GFX_COUNT + columns - 1) // columns
    object_sheet = Image.new("RGBA", (columns * cell, rows * cell), (0, 0, 0, 0))
    for graphics_id in range(OBJECT_GFX_COUNT):
        img = read_object_frame(rom, palettes, graphics_id, 0)
        if not img:
            continue
        x = (graphics_id % columns) * cell + (cell - img.width) // 2
        y = (graphics_id // columns) * cell + cell - img.height
        object_sheet.alpha_composite(img, (x, y))
    object_sheet.save(object_path)


def map_header(rom: bytes, bank: int, map_no: int) -> int:
    bank_table = ptr(rom, POINTER_TO_MAP_BANKS)
    bank_ptr = ptr(rom, bank_table + bank * 4)
    return ptr(rom, bank_ptr + map_no * 4)


def read_warps(rom: bytes, events: int) -> list[dict[str, int | str]]:
    count = u8(rom, events + 1)
    warps_ptr = safe_ptr(rom, events + 8)
    if not warps_ptr:
        return []
    warps = []
    for i in range(count):
        off = warps_ptr + i * 8
        target_bank = u8(rom, off + 7)
        target_map = u8(rom, off + 6)
        warps.append({
            "x": s16(rom, off),
            "y": s16(rom, off + 2),
            "elevation": u8(rom, off + 4),
            "warpId": u8(rom, off + 5),
            "target": f"b{target_bank}_m{target_map}" if target_bank != 127 and target_map != 127 else "",
        })
    return warps


def read_objects(rom: bytes, events: int) -> list[dict[str, int | str]]:
    count = u8(rom, events)
    objects_ptr = safe_ptr(rom, events + 4)
    if not objects_ptr:
        return []
    objects = []
    for i in range(count):
        off = objects_ptr + i * 24
        objects.append({
            "id": f"obj{i + 1}",
            "localId": u8(rom, off),
            "graphicsId": u8(rom, off + 1),
            "x": s16(rom, off + 4),
            "y": s16(rom, off + 6),
            "movement": u8(rom, off + 9),
        })
    return objects


def read_connections(rom: bytes, header: int) -> list[dict[str, int | str]]:
    connections_ptr = safe_ptr(rom, header + 12)
    if not connections_ptr:
        return []
    count = u32(rom, connections_ptr)
    list_ptr = safe_ptr(rom, connections_ptr + 4)
    if not list_ptr or count > 16:
        return []
    direction_names = {1: "south", 2: "north", 3: "west", 4: "east"}
    connections = []
    for i in range(count):
        off = list_ptr + i * 12
        direction = u32(rom, off)
        target_bank = u8(rom, off + 8)
        target_map = u8(rom, off + 9)
        connections.append({
            "direction": direction_names.get(direction, str(direction)),
            "offset": s32(rom, off + 4),
            "target": f"b{target_bank}_m{target_map}",
        })
    return connections


def main() -> None:
    rom_path = Path(sys.argv[1]) if len(sys.argv) > 1 else ROM_DEFAULT
    rom = rom_path.read_bytes()
    map_names = read_names()
    tileset_pairs: list[tuple[int, int]] = []
    maps: dict[str, dict] = {}

    for bank, map_no in SELECTED_MAPS:
        if bank >= len(BANK_COUNTS) or map_no >= BANK_COUNTS[bank]:
            continue
        header = map_header(rom, bank, map_no)
        layout = ptr(rom, header)
        events = ptr(rom, header + 4)
        width = u32(rom, layout)
        height = u32(rom, layout + 4)
        map_data = ptr(rom, layout + 12)
        pair = (ptr(rom, layout + 16), ptr(rom, layout + 20))
        if pair not in tileset_pairs:
            tileset_pairs.append(pair)
        pair_index = tileset_pairs.index(pair)
        raw_name = map_names.get((bank, map_no), f"{bank}.{map_no}")
        display_name = DISPLAY_NAMES_BY_ID.get((bank, map_no)) or DISPLAY_NAMES.get(raw_name.upper(), raw_name or f"{bank}.{map_no}")
        rows: list[list[int]] = []
        collision: list[list[int]] = []
        elevation: list[list[int]] = []
        for y in range(height):
            row = []
            col = []
            elev = []
            for x in range(width):
                value = u16(rom, map_data + (y * width + x) * 2)
                row.append(value & 0x3FF)
                col.append((value >> 10) & 0x3)
                elev.append((value >> 12) & 0xF)
            rows.append(row)
            collision.append(col)
            elevation.append(elev)
        maps[f"b{bank}_m{map_no}"] = {
            "id": f"b{bank}_m{map_no}",
            "bank": bank,
            "map": map_no,
            "name": display_name,
            "romName": raw_name,
            "width": width,
            "height": height,
            "section": u8(rom, header + 20),
            "mapType": u8(rom, header + 23),
            "tilesetPair": pair_index,
            "tiles": rows,
            "collision": collision,
            "elevation": elevation,
            "warps": read_warps(rom, events),
            "connections": read_connections(rom, header),
            "objects": read_objects(rom, events),
        }

    atlas_cols = 32
    atlas_rows_per_pair = 32
    atlas = Image.new("RGBA", (atlas_cols * 16, len(tileset_pairs) * atlas_rows_per_pair * 16), (0, 0, 0, 0))
    for pair_index, (primary_ptr, secondary_ptr) in enumerate(tileset_pairs):
        primary = Tileset(rom, primary_ptr)
        secondary = Tileset(rom, secondary_ptr)
        for metatile in range(1024):
            x = (metatile % atlas_cols) * 16
            y = (pair_index * atlas_rows_per_pair + metatile // atlas_cols) * 16
            draw_metatile(rom, atlas, x, y, metatile, primary, secondary)

    data = {
        "sourceRom": rom_path.name,
        "tileSize": 16,
        "atlas": {
            "src": "/assets/concordium-rom-atlas.png?v=rom-20260629",
            "columns": atlas_cols,
            "rowsPerTilesetPair": atlas_rows_per_pair,
        },
        "sprites": {
            "src": "/assets/concordium-overworld-sprites.png?v=rom-20260629b",
            "width": 32,
            "height": 32,
            "frames": 8,
            "directionFrames": {
                "down": [0, 1],
                "up": [3, 4],
                "left": [5, 6],
                "right": [7, 6],
            },
        },
        "objectSprites": {
            "src": "/assets/concordium-object-sprites.png?v=rom-20260629b",
            "width": 48,
            "height": 48,
            "columns": 16,
        },
        "start": {"map": "b25_m40", "x": 3, "y": 2, "dir": "right"},
        "fallbackExits": [
            {"from": "b25_m40", "x": 4, "y": 1, "to": "b0_m9", "tx": 10, "ty": 9},
            {"from": "b25_m40", "x": 4, "y": 2, "to": "b0_m9", "tx": 10, "ty": 9},
            {"from": "b25_m40", "x": 4, "y": 3, "to": "b0_m9", "tx": 10, "ty": 9},
        ],
        "maps": maps,
    }
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    atlas.save(OUT_DIR / "concordium-rom-atlas.png")
    make_overworld_sprites(rom, OUT_DIR / "concordium-overworld-sprites.png", OUT_DIR / "concordium-object-sprites.png")
    (OUT_DIR / "concordium-rom-data.json").write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"exported {len(maps)} maps and {len(tileset_pairs)} tileset pairs from {rom_path}")


if __name__ == "__main__":
    main()
