from __future__ import annotations

import json
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "public" / "assets" / "heroi-ortodoxo" / "enemies"
SOURCE = ASSETS / "source"
FRAME_SIZE = 512

BOOKS = {
    "genesis": {
        "source": "genesis-alpha.png",
        "enemies": [
            ("serpente-do-ermo", "Serpente do Ermo"),
            ("espinheiro-bravo", "Espinheiro Bravo"),
            ("fera-do-campo", "Fera do Campo"),
        ],
    },
    "exodo": {
        "source": "exodo-alpha.png",
        "enemies": [
            ("feitor-egipcio", "Feitor Egípcio"),
            ("cocheiro-do-farao", "Cocheiro do Faraó"),
            ("lanceiro-do-egito", "Lanceiro do Egito"),
        ],
    },
    "levitico": {
        "source": "levitico-alpha.png",
        "enemies": [
            ("escorpiao-do-deserto", "Escorpião do Deserto"),
            ("fera-impura", "Fera Impura"),
            ("invasor-do-acampamento", "Invasor do Acampamento"),
        ],
    },
}


def prepare_book(book_id: str, config: dict) -> list[dict]:
    source_path = SOURCE / config["source"]
    sheet = Image.open(source_path).convert("RGBA")
    cell_w = sheet.width // 4
    cell_h = sheet.height // 3
    prepared = []

    for row, (enemy_id, enemy_name) in enumerate(config["enemies"]):
        enemy_dir = ASSETS / book_id / enemy_id
        frames_dir = enemy_dir / "frames"
        frames_dir.mkdir(parents=True, exist_ok=True)
        source_frames = []
        boxes = []

        for column in range(4):
            left = column * cell_w
            top = row * cell_h
            right = sheet.width if column == 3 else left + cell_w
            bottom = sheet.height if row == 2 else top + cell_h
            source_frame = sheet.crop((left, top, right, bottom))
            alpha_box = source_frame.getchannel("A").getbbox()
            source_frames.append(source_frame)
            boxes.append(alpha_box or (0, 0, source_frame.width, source_frame.height))

        max_width = max(box[2] - box[0] for box in boxes)
        max_height = max(box[3] - box[1] for box in boxes)
        shared_scale = min(468 / max_width, 452 / max_height)
        frames = []

        for column, (source_frame, box) in enumerate(zip(source_frames, boxes)):
            subject = source_frame.crop(box)
            width = max(1, round(subject.width * shared_scale))
            height = max(1, round(subject.height * shared_scale))
            subject = subject.resize((width, height), Image.Resampling.LANCZOS)
            frame = Image.new("RGBA", (FRAME_SIZE, FRAME_SIZE), (0, 0, 0, 0))
            x = (FRAME_SIZE - width) // 2
            y = 498 - height
            frame.alpha_composite(subject, (x, y))
            frame_path = frames_dir / f"frame-{column + 1:02d}.png"
            frame.save(frame_path, optimize=True)
            frames.append(frame_path)

        idle_path = enemy_dir / "side-idle.png"
        Image.open(frames[0]).save(idle_path, optimize=True)

        strip = Image.new("RGBA", (FRAME_SIZE * 4, FRAME_SIZE), (0, 0, 0, 0))
        for column, frame_path in enumerate(frames):
            strip.alpha_composite(Image.open(frame_path).convert("RGBA"), (column * FRAME_SIZE, 0))
        strip_path = enemy_dir / "strip.png"
        strip.save(strip_path, optimize=True)

        web_root = f"/assets/heroi-ortodoxo/enemies/{book_id}/{enemy_id}"
        manifest = {
            "id": enemy_id,
            "name": enemy_name,
            "book": book_id,
            "facing": "left",
            "anchor": {"type": "bottom-center", "canvas": [FRAME_SIZE, FRAME_SIZE]},
            "idle": f"{web_root}/side-idle.png",
            "animation": {
                "fps": 10,
                "frames": [f"{web_root}/frames/frame-{index:02d}.png" for index in range(1, 5)],
                "strip": f"{web_root}/strip.png",
                "poses": ["idle", "windup", "impact", "hurt"],
            },
        }
        (enemy_dir / "manifest.json").write_text(
            json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        prepared.append(manifest)

    return prepared


def main() -> None:
    manifest = {"version": 1, "frameSize": FRAME_SIZE, "books": {}}
    for book_id, config in BOOKS.items():
        manifest["books"][book_id] = prepare_book(book_id, config)
    (ASSETS / "enemies-manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
