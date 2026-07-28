"""Remove residual light ground mattes from Guardioes ally PNG assets."""

from __future__ import annotations

import argparse
from collections import deque
from pathlib import Path

from PIL import Image


EXCLUSION_RECTS: dict[str, tuple[tuple[int, int, int, int], ...]] = {
    "ally-priest-lv2.png": ((0, 0, 512, 140),),
    "ally-priest-lv3.png": ((0, 0, 512, 120),),
    "ally-shieldbearer-lv3.png": (
        (0, 0, 512, 62),
        (100, 443, 160, 512),
        (205, 444, 250, 512),
        (276, 450, 365, 512),
    ),
    "ally-zealot-lv1.png": ((300, 388, 410, 512),),
    "ally-zealot-lv2.png": ((305, 405, 430, 512),),
    "ally-zealot-lv3.png": ((280, 404, 420, 512),),
}


def is_matte_candidate(pixel: tuple[int, int, int, int], y: int, height: int) -> bool:
    r, g, b, alpha = pixel
    if alpha == 0 or y < int(height * 0.72):
        return False
    high = max(r, g, b)
    low = min(r, g, b)
    saturation = 0 if high == 0 else (high - low) / high
    return high >= 92 and saturation <= 0.38


def matte_components(image: Image.Image) -> list[list[tuple[int, int]]]:
    width, height = image.size
    pixels = image.load()
    candidates = {
        (x, y)
        for y in range(int(height * 0.72), height)
        for x in range(width)
        if is_matte_candidate(pixels[x, y], y, height)
    }
    components: list[list[tuple[int, int]]] = []

    while candidates:
        start = candidates.pop()
        component = [start]
        queue = deque([start])
        while queue:
            x, y = queue.popleft()
            for neighbor in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                if neighbor not in candidates:
                    continue
                candidates.remove(neighbor)
                component.append(neighbor)
                queue.append(neighbor)
        components.append(component)
    return components


def clean_image(path: Path, output: Path) -> tuple[int, int]:
    image = Image.open(path).convert("RGBA")
    width, height = image.size
    selected: list[tuple[int, int]] = []

    for component in matte_components(image):
        xs = [point[0] for point in component]
        ys = [point[1] for point in component]
        box_width = max(xs) - min(xs) + 1
        box_height = max(ys) - min(ys) + 1
        if (
            len(component) >= 80
            and box_width >= int(width * 0.12)
            and box_height <= int(height * 0.22)
            and max(ys) >= int(height * 0.74)
        ):
            selected.extend(component)

    pixels = image.load()
    for x, y in selected:
        r, g, b, _ = pixels[x, y]
        pixels[x, y] = (r, g, b, 0)

    for left, top, right, bottom in EXCLUSION_RECTS.get(path.name, ()):
        for y in range(top, bottom):
            for x in range(left, right):
                r, g, b, _ = pixels[x, y]
                pixels[x, y] = (r, g, b, 0)

    output.parent.mkdir(parents=True, exist_ok=True)
    image.save(output)
    return len(selected), len(matte_components(image))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("inputs", nargs="+", type=Path)
    parser.add_argument("--output-dir", type=Path)
    args = parser.parse_args()

    for source in args.inputs:
        destination = (args.output_dir / source.name) if args.output_dir else source
        removed, remaining = clean_image(source, destination)
        print(f"{source.name}: removed={removed} residual_components={remaining}")


if __name__ == "__main__":
    main()
