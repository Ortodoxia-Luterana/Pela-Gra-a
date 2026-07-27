from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "games" / "cores-da-rosa" / "art-source" / "cards-liturgical-sheet.png"
OUTPUT = ROOT / "games" / "cores-da-rosa" / "public" / "assets" / "cards"

CARDS = {
    "card-white.png": (159, 23, 518, 510),
    "card-red.png": (587, 23, 946, 510),
    "card-green.png": (1015, 23, 1373, 510),
    "card-purple.png": (159, 539, 518, 994),
    "card-rose.png": (587, 539, 946, 994),
    "card-back.png": (1015, 539, 1373, 994),
}


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    sheet = Image.open(SOURCE).convert("RGB")
    for filename, bounds in CARDS.items():
        card = sheet.crop(bounds).resize((360, 500), Image.Resampling.LANCZOS)
        card.save(OUTPUT / filename, optimize=True)
    print(f"Processed {len(CARDS)} cards into {OUTPUT}")


if __name__ == "__main__":
    main()
