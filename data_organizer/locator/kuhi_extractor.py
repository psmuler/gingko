import os
import csv
import zipfile
import xml.etree.ElementTree as ET
import requests

API_KEY = os.environ.get('GOOGLE_MAP_API_KEY')
CSV_FILE = "places.csv"
IMAGE_DIR = "images"

os.makedirs(IMAGE_DIR, exist_ok=True)


def read_existing_place_ids(csv_file):
    if not os.path.exists(csv_file):
        return set()
    with open(csv_file, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        return {row["place_id"] for row in reader}


def parse_kmz(kmz_file):
    with zipfile.ZipFile(kmz_file, "r") as z:
        with z.open("doc.kml") as kml:
            tree = ET.parse(kml)
            root = tree.getroot()

            ns = {"kml": "http://www.opengis.net/kml/2.2"}
            for pm in root.findall(".//kml:Placemark", ns):
                name_elem = pm.find("kml:name", ns)
                coords_elem = pm.find(".//kml:coordinates", ns)
                if name_elem is not None and coords_elem is not None:
                    coords = coords_elem.text.strip().split(",")
                    lon, lat = coords[0], coords[1]
                    yield name_elem.text, lat, lon


def get_place_id(name, lat, lon):
    url = f"https://maps.googleapis.com/maps/api/place/findplacefromtext/json"
    params = {
        "input": name,
        "inputtype": "textquery",
        "locationbias": f"point:{lat},{lon}",
        "key": API_KEY,
    }
    r = requests.get(url, params=params)
    data = r.json()
    if data.get("candidates"):
        return data["candidates"][0]["place_id"]
    else:
        print(data)
    return None


def get_place_details(place_id):
    url = f"https://maps.googleapis.com/maps/api/place/details/json"
    params = {
        "place_id": place_id,
        "fields": "name,formatted_address,geometry,reviews,photos",
        "language": "ja",
        "key": API_KEY,
    }
    r = requests.get(url, params=params)
    return r.json().get("result", {})


def save_photo(photo_ref, place_id, index):
    url = f"https://maps.googleapis.com/maps/api/place/photo"
    params = {
        "maxwidth": 800,
        "photoreference": photo_ref,
        "key": API_KEY,
    }
    r = requests.get(url, params=params, stream=True)
    if r.status_code == 200:
        filename = os.path.join(IMAGE_DIR, f"{place_id}_{index}.jpg")
        with open(filename, "wb") as f:
            for chunk in r.iter_content(1024):
                f.write(chunk)


def main():
    existing_ids = read_existing_place_ids(CSV_FILE)

    with open(CSV_FILE, "a", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["place_id", "name", "address", "lat", "lon", "reviews"])
        if os.stat(CSV_FILE).st_size == 0:
            writer.writeheader()

        for name, lat, lon in parse_kmz("kuhis.kmz"):
            print(f"処理中: {name}")
            place_id = get_place_id(name, lat, lon)
            if not place_id:
                print(f"見つからない: {name}")
            if place_id in existing_ids:
                print(f"スキップ: {name}")
                continue

            details = get_place_details(place_id)
            reviews = []
            if "reviews" in details:
                for r in details["reviews"]:
                    text = r.get("text", "").replace("\n", " ").strip()
                    reviews.append(text)
            reviews_str = "\n".join(reviews)

            # 写真保存
            if "photos" in details:
                for i, photo in enumerate(details["photos"]):
                    save_photo(photo["photo_reference"], place_id, i + 1)

            writer.writerow({
                "place_id": place_id,
                "name": details.get("name", name),
                "address": details.get("formatted_address", ""),
                "lat": lat,
                "lon": lon,
                "reviews": reviews_str,
            })
            f.flush()

if __name__ == "__main__":
    main()