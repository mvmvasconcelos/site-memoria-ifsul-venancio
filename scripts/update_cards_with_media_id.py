#!/usr/bin/env python3

import json
import sys
from pathlib import Path

from sqlalchemy import inspect, text

PROJECT_ROOT = Path(__file__).resolve().parents[1]
BACKEND_ROOT = PROJECT_ROOT / "backend"

sys.path.insert(0, str(BACKEND_ROOT))

from app import create_app  # noqa: E402
from app.extensions import db  # noqa: E402
from app.models import MediaFile  # noqa: E402


def normalize_keys(image_path: str) -> list[str]:
    raw = (image_path or "").strip().replace("\\", "/")
    if not raw:
        return []

    clean = raw.lstrip("/")
    keys = {
        clean,
        f"/{clean}",
    }

    if clean.startswith("src/images/"):
        relative = clean.removeprefix("src/images/")
        keys.update({relative, f"images/{relative}", f"/images/{relative}"})
    elif clean.startswith("images/"):
        relative = clean.removeprefix("images/")
        keys.update({relative, f"src/images/{relative}", f"/src/images/{relative}"})

    return [key for key in keys if key]


def main() -> None:
    app = create_app()
    map_file = PROJECT_ROOT / "scripts" / "legacy_image_map.json"

    print("\n" + "=" * 60)
    print("UPDATE CARDS WITH MEDIA_ID")
    print("=" * 60 + "\n")

    with app.app_context():
        columns = {column["name"] for column in inspect(db.engine).get_columns("card_item")}
        if "media_id" not in columns:
            print("Coluna card_item.media_id não existe no schema atual. Nada para atualizar.")
            return

        image_map: dict[str, int] = {}
        if map_file.exists():
            with map_file.open("r", encoding="utf-8") as file_obj:
                image_map = json.load(file_obj)

        rows = db.session.execute(text("SELECT id, image_path, media_id FROM card_item ORDER BY id ASC")).mappings().all()
        stats = {"updated": 0, "not_found": 0, "already_set": 0, "without_path": 0}

        for row in rows:
            card_id = row["id"]
            image_path = row["image_path"]
            media_id = row["media_id"]

            if media_id:
                stats["already_set"] += 1
                continue

            if not image_path:
                stats["without_path"] += 1
                continue

            mapped_id = None
            for key in normalize_keys(image_path):
                if key in image_map:
                    mapped_id = image_map[key]
                    break

            if mapped_id is None:
                filename = Path(image_path).name
                media = MediaFile.query.filter_by(filename=filename).first()
                mapped_id = media.id if media else None

            if mapped_id is None:
                stats["not_found"] += 1
                print(f"MISS Card {card_id}: {image_path}")
                continue

            db.session.execute(
                text("UPDATE card_item SET media_id = :media_id WHERE id = :card_id"),
                {"media_id": int(mapped_id), "card_id": int(card_id)},
            )
            stats["updated"] += 1
            print(f"UPDATE Card {card_id} -> media_id={mapped_id}")

        db.session.commit()

    print("\n" + "=" * 60)
    print("RESULTADO")
    print("=" * 60)
    print(f"Atualizados: {stats['updated']}")
    print(f"Não encontrados: {stats['not_found']}")
    print(f"Já tinham ID: {stats['already_set']}")
    print(f"Sem image_path: {stats['without_path']}")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    main()
