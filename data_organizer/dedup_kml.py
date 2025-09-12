import zipfile
from lxml import etree
import os

input_kmz = "句碑.kmz"
output_kmz = "output_dedup.kmz"

# 展開用ディレクトリ
tmp_dir = "tmp_kmz"
os.makedirs(tmp_dir, exist_ok=True)

# KMZ を解凍
with zipfile.ZipFile(input_kmz, "r") as kmz:
    kmz.extractall(tmp_dir)

# KML ファイルを探す（通常は doc.kml）
kml_path = None
for file in os.listdir(tmp_dir):
    if file.endswith(".kml"):
        kml_path = os.path.join(tmp_dir, file)
        break

if not kml_path:
    raise FileNotFoundError("KMZ 内に KML が見つかりません")

# KML を読み込む
tree = etree.parse(kml_path)
root = tree.getroot()

ns = {"kml": "http://www.opengis.net/kml/2.2"}
seen_coords = set()

# Placemark をチェックして重複削除
for placemark in root.findall(".//kml:Placemark", ns):
    coords = placemark.find(".//kml:coordinates", ns)
    if coords is not None:
        coord_text = coords.text.strip()
        if coord_text in seen_coords:
            placemark.getparent().remove(placemark)
        else:
            seen_coords.add(coord_text)

# 上書き保存
tree.write(kml_path, encoding="utf-8", xml_declaration=True, pretty_print=True)

# 新しい KMZ に圧縮
with zipfile.ZipFile(output_kmz, "w", zipfile.ZIP_DEFLATED) as kmz:
    for file in os.listdir(tmp_dir):
        kmz.write(os.path.join(tmp_dir, file), file)

print("重複削除済み KMZ を保存しました:", output_kmz)