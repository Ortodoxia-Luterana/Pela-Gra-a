import json
import math
import urllib.request
from pathlib import Path

from shapely.geometry import MultiPolygon, Polygon, box, shape
from shapely.ops import unary_union


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "santa-conquista-topology.js"

LAND_URL = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_land.geojson"
REGION = {
    "lon_min": -11.5,
    "lat_min": 28.0,
    "lon_max": 46.5,
    "lat_max": 63.5,
    "width": 1600,
    "height": 950,
}


PROVINCE_BOXES = {
    "galicia": (-9.5, 41.6, -6.2, 43.7),
    "portugal": (-9.8, 36.7, -6.1, 41.8),
    "leon": (-7.2, 40.6, -3.4, 43.5),
    "castile": (-4.5, 39.4, -1.1, 42.3),
    "toledo": (-5.8, 37.5, -1.4, 40.4),
    "aragon": (-1.7, 40.3, 2.2, 42.8),
    "barcelona": (1.0, 40.7, 3.3, 42.7),
    "valencia": (-1.4, 37.2, 0.9, 40.4),
    "al_andalus": (-7.4, 36.0, -1.2, 38.9),
    "dublin": (-10.6, 51.4, -5.5, 55.5),
    "edinburgh": (-6.3, 54.5, -1.5, 58.8),
    "york": (-3.9, 53.0, -0.2, 55.8),
    "london": (-5.7, 50.0, 1.8, 53.2),
    "normandy": (-2.0, 48.3, 1.6, 50.3),
    "paris": (1.0, 47.7, 4.0, 49.5),
    "reims": (3.0, 48.4, 6.8, 50.3),
    "flanders": (2.3, 50.1, 5.9, 52.0),
    "aquitaine": (-2.1, 44.4, 1.6, 47.8),
    "toulouse": (0.0, 42.5, 3.3, 44.7),
    "provence": (3.2, 43.0, 7.6, 44.8),
    "cologne": (5.6, 49.4, 8.4, 52.0),
    "saxony": (8.0, 51.3, 12.9, 54.3),
    "denmark": (8.0, 54.4, 12.9, 57.9),
    "norway": (5.0, 58.0, 12.6, 62.9),
    "sweden": (12.5, 55.3, 18.9, 61.3),
    "poland": (14.0, 50.0, 21.6, 54.5),
    "bohemia": (12.0, 48.2, 16.6, 51.2),
    "bavaria": (9.0, 47.0, 13.3, 49.8),
    "austria": (13.0, 46.5, 17.6, 49.0),
    "hungary": (16.0, 45.3, 23.6, 49.6),
    "lombardy": (7.5, 44.5, 11.3, 46.6),
    "venice": (11.2, 44.5, 14.1, 46.4),
    "tuscany": (9.5, 42.0, 12.3, 44.6),
    "rome": (11.5, 40.8, 14.2, 42.7),
    "naples": (13.0, 39.5, 16.5, 41.6),
    "sicily": (12.1, 36.4, 15.6, 38.5),
    "croatia": (14.0, 44.0, 17.9, 46.6),
    "serbia": (18.0, 42.0, 22.0, 45.3),
    "bulgaria": (22.0, 41.6, 28.1, 44.6),
    "thessalonica": (20.5, 39.0, 24.1, 41.8),
    "athens": (21.0, 36.3, 24.2, 39.0),
    "constantinople": (26.0, 40.4, 29.7, 42.1),
    "nicaea": (28.0, 39.4, 31.6, 41.2),
    "anatolia": (31.0, 37.5, 36.0, 40.5),
    "trebizond": (36.0, 39.5, 41.0, 42.2),
    "georgia": (41.0, 41.0, 46.0, 43.8),
    "cilicia": (32.0, 36.0, 36.0, 38.0),
    "edessa": (37.5, 36.5, 40.8, 38.5),
    "antioch": (35.5, 35.2, 37.5, 36.7),
    "tripoli": (35.2, 33.6, 36.2, 35.0),
    "tyre": (35.0, 32.8, 35.7, 33.5),
    "acre": (34.9, 32.4, 35.6, 32.9),
    "tiberias": (35.4, 32.6, 36.0, 33.4),
    "jaffa": (34.5, 31.8, 35.2, 32.4),
    "ascalon": (34.2, 31.3, 35.0, 31.9),
    "jerusalem": (35.0, 31.5, 35.8, 32.1),
    "kerak": (35.5, 30.7, 36.3, 31.5),
    "aleppo": (36.5, 35.2, 38.4, 36.8),
    "damascus": (35.8, 32.8, 37.2, 34.2),
    "mosul": (40.0, 35.5, 44.2, 37.5),
    "alexandria": (29.0, 30.5, 31.5, 31.5),
    "cairo": (30.4, 29.5, 32.2, 30.6),
    "cyrenaica": (20.0, 29.0, 29.0, 32.8),
    "ifriqiya": (9.0, 32.0, 20.0, 37.2),
    "maghreb": (-6.0, 30.5, 9.0, 36.8),
}


def load_geojson(url):
    with urllib.request.urlopen(url) as response:
        return json.load(response)


def mercator_y(lat):
    lat = max(-85, min(85, lat))
    rad = math.radians(lat)
    return math.log(math.tan(math.pi / 4 + rad / 2))


MERC_TOP = mercator_y(REGION["lat_max"])
MERC_BOTTOM = mercator_y(REGION["lat_min"])


def project(lon, lat):
    x = (lon - REGION["lon_min"]) / (REGION["lon_max"] - REGION["lon_min"]) * REGION["width"]
    y = (MERC_TOP - mercator_y(lat)) / (MERC_TOP - MERC_BOTTOM) * REGION["height"]
    return round(x, 2), round(y, 2)


def ring_to_path(ring):
    points = list(ring.coords)
    if len(points) < 4:
        return ""
    # Keep the map compact without losing coast character.
    skip = max(1, len(points) // 80)
    sampled = points[::skip]
    if sampled[-1] != points[-1]:
        sampled.append(points[-1])
    parts = []
    for index, (lon, lat) in enumerate(sampled):
        x, y = project(lon, lat)
        parts.append(("M" if index == 0 else "L") + f"{x:g},{y:g}")
    return " ".join(parts) + " Z"


def geometry_to_paths(geom):
    if geom.is_empty:
        return []
    if isinstance(geom, Polygon):
        return [ring_to_path(geom.exterior)]
    if isinstance(geom, MultiPolygon):
        return [ring_to_path(poly.exterior) for poly in geom.geoms if poly.area > 0.01]
    if geom.geom_type == "GeometryCollection":
        paths = []
        for item in geom.geoms:
            paths.extend(geometry_to_paths(item))
        return paths
    return []


def province_shape(bounds):
    lon1, lat1, lon2, lat2 = bounds
    dx = (lon2 - lon1) * 0.08
    dy = (lat2 - lat1) * 0.08
    return Polygon([
        (lon1 + dx, lat1),
        (lon1 + (lon2 - lon1) * 0.46, lat1 + dy * 0.4),
        (lon2 - dx * 0.5, lat1 + dy),
        (lon2, lat1 + (lat2 - lat1) * 0.45),
        (lon2 - dx, lat2 - dy * 0.35),
        (lon1 + (lon2 - lon1) * 0.55, lat2),
        (lon1 + dx * 0.3, lat2 - dy),
        (lon1, lat1 + (lat2 - lat1) * 0.52),
    ])


def main():
    land_data = load_geojson(LAND_URL)
    region_box = box(REGION["lon_min"], REGION["lat_min"], REGION["lon_max"], REGION["lat_max"])
    land_parts = []
    for feature in land_data["features"]:
        geom = shape(feature["geometry"])
        if not geom.intersects(region_box):
            continue
        clipped = geom.intersection(region_box)
        if not clipped.is_empty:
            land_parts.append(clipped)
    land = unary_union(land_parts)

    land_paths = geometry_to_paths(land)
    province_paths = {}
    centers = {}
    for province_id, bounds in PROVINCE_BOXES.items():
        clipped = province_shape(bounds).intersection(land)
        paths = [path for path in geometry_to_paths(clipped) if path]
        if not paths:
            continue
        province_paths[province_id] = " ".join(paths)
        point = clipped.representative_point()
        centers[province_id] = dict(zip(("x", "y"), project(point.x, point.y)))

    payload = {
        "viewBox": f"0 0 {REGION['width']} {REGION['height']}",
        "bounds": REGION,
        "source": {
            "land": "Natural Earth 1:50m land polygons, public domain",
            "provinceLayer": "Santa Conquista custom historical-play province layer clipped to Natural Earth land",
        },
        "landPaths": land_paths,
        "provincePaths": province_paths,
        "centers": centers,
    }

    text = "window.SANTA_CONQUISTA_TOPOLOGY = "
    text += json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
    text += ";\n"
    OUT.write_text(text, encoding="utf-8")
    print(f"Wrote {OUT} with {len(land_paths)} land paths and {len(province_paths)} province paths")


if __name__ == "__main__":
    main()
