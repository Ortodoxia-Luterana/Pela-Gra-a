from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
ENVIRONMENT_OUTPUT = ROOT / "games" / "cores-da-rosa" / "public" / "assets" / "environment"


def main() -> None:
    ENVIRONMENT_OUTPUT.mkdir(parents=True, exist_ok=True)
    room = Image.open(ROOT / "games" / "cores-da-rosa" / "art-source" / "game-room-v2-source.png").convert("RGB")
    room.save(ENVIRONMENT_OUTPUT / "game-room-v2.webp", "WEBP", quality=88, method=6)
    print(f"Processed the game room into {ENVIRONMENT_OUTPUT}")


if __name__ == "__main__":
    main()
