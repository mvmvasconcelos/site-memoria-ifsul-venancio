#!/usr/bin/env python3

import json
import os
import shutil
import sys
from hashlib import md5
from pathlib import Path
from uuid import uuid4

PROJECT_ROOT = Path(__file__).resolve().parents[1]
BACKEND_ROOT = PROJECT_ROOT / "backend"

sys.path.insert(0, str(BACKEND_ROOT))

from app import create_app  # noqa: E402
from app.extensions import db  # noqa: E402
from app.models import MediaFile  # noqa: E402


ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "webp", "gif"}
FOLDER_MAPPING = {
    "campus": "campus",
    "territorio": "territorio",
    "trabalhos": "trabalhos",
    "timeline": "timeline",
}


def is_valid_image(filepath: Path) -> bool:
    return filepath.suffix.lower().lstrip(".") in ALLOWED_EXTENSIONS


def get_folder_from_path(relative_path: Path) -> str:
    for part in relative_path.parts:
        key = part.lower()
        if key in FOLDER_MAPPING:
            return FOLDER_MAPPING[key]
    return "uploads"


def get_file_hash(filepath: Path) -> str:
    hash_md5 = md5()
    with filepath.open("rb") as file_obj:
        for chunk in iter(lambda: file_obj.read(4096), b""):
            hash_md5.update(chunk)
    return hash_md5.hexdigest()


def ensure_unique_filename(session, filename: str) -> str:
    existing = session.query(MediaFile.id).filter_by(filename=filename).first()
    if not existing:
        return filename

    stem = Path(filename).stem
    suffix = Path(filename).suffix
    return f"{stem}__{uuid4().hex[:8]}{suffix}"


def build_map_keys(relative_path: str) -> list[str]:
    normalized = relative_path.replace("\\", "/").lstrip("/")
    keys = {
        normalized,
        f"src/images/{normalized}",
        f"/src/images/{normalized}",
        f"images/{normalized}",
        f"/images/{normalized}",
    }
    return sorted(keys)


def main() -> None:
    app = create_app()
    image_root = PROJECT_ROOT / "src" / "images"
    upload_root = PROJECT_ROOT / "uploads"
    map_file = PROJECT_ROOT / "scripts" / "legacy_image_map.json"

    print("\n" + "=" * 60)
    print("SCAN & IMPORT LEGACY IMAGES")
    print("=" * 60 + "\n")

    if not image_root.exists():
        print(f"Pasta não encontrada: {image_root}")
        return

    stats = {
        "total": 0,
        "imported": 0,
        "duplicates": 0,
        "errors": 0,
    }

    image_map: dict[str, int] = {}
    processed_hashes: set[str] = set()

    with app.app_context():
        for root, _, files in os.walk(image_root):
            for filename in files:
                original_path = Path(root) / filename
                stats["total"] += 1

                if not is_valid_image(original_path):
                    continue

                try:
                    relative = original_path.relative_to(image_root)
                    folder = get_folder_from_path(relative)

                    content_hash = get_file_hash(original_path)
                    if content_hash in processed_hashes:
                        stats["duplicates"] += 1
                        continue
                    processed_hashes.add(content_hash)

                    ext = original_path.suffix.lower()
                    new_name = f"{uuid4().hex}{ext}"
                    destination_folder = upload_root / folder
                    destination_folder.mkdir(parents=True, exist_ok=True)
                    destination_path = destination_folder / new_name

                    shutil.copy2(original_path, destination_path)

                    original_filename = ensure_unique_filename(db.session, filename)
                    media = MediaFile(
                        filename=original_filename,
                        file_path=f"{folder}/{new_name}",
                        folder=folder,
                        file_size=destination_path.stat().st_size,
                        mime_type=f"image/{ext.lstrip('.')}",
                        description=filename,
                        alt_text=filename,
                    )
                    db.session.add(media)
                    db.session.flush()

                    relative_text = str(relative).replace("\\", "/")
                    for key in build_map_keys(relative_text):
                        image_map[key] = media.id

                    stats["imported"] += 1
                    print(f"IMPORT {relative_text} -> {media.file_path} (ID={media.id})")

                except Exception as exc:
                    stats["errors"] += 1
                    print(f"ERROR {original_path}: {exc}")

        db.session.commit()

    with map_file.open("w", encoding="utf-8") as file_obj:
        json.dump(image_map, file_obj, ensure_ascii=False, indent=2)

    print("\n" + "=" * 60)
    print("RESULTADO")
    print("=" * 60)
    print(f"Total processados: {stats['total']}")
    print(f"Importados: {stats['imported']}")
    print(f"Duplicados: {stats['duplicates']}")
    print(f"Erros: {stats['errors']}")
    print(f"Mapa salvo em: {map_file}")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    main()
