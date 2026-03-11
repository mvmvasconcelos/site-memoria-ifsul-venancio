#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sqlite3
from dataclasses import asdict, dataclass
from datetime import datetime
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DB_PATH = PROJECT_ROOT / "database" / "memoria.db"
REPORTS_ROOT = PROJECT_ROOT / "reports" / "reconciliation"


@dataclass
class Change:
    action: str
    details: dict


def now_stamp() -> str:
    return datetime.now().strftime("%Y%m%d-%H%M%S")


def basename(path: str | None) -> str:
    raw = (path or "").strip()
    return raw.split("/")[-1] if raw else ""


def usage_requirements(cur: sqlite3.Cursor) -> dict[tuple[str, str], dict]:
    pages = {row[1]: int(row[0]) for row in cur.execute("SELECT id, slug FROM page")}
    req: dict[tuple[str, str], dict] = {}

    if "timeline" in pages:
        for row in cur.execute("SELECT id, image_path FROM timeline_item WHERE page_id=?", (pages["timeline"],)):
            image = (row[1] or "").strip()
            if image.startswith("src/images/"):
                name = basename(image)
                if name:
                    req[("timeline", name)] = {"entity": "timeline_item", "id": int(row[0]), "image_path": image}

    for slug, folder, prefix in [
        ("campus", "campus", "src/images/campus/"),
        ("territorio", "territorio", "src/images/territorio/"),
    ]:
        if slug not in pages:
            continue
        for row in cur.execute("SELECT id, image_path FROM card_item WHERE page_id=?", (pages[slug],)):
            image = (row[1] or "").strip()
            if image.startswith(prefix):
                name = basename(image)
                if name:
                    req[(folder, name)] = {"entity": "card_item", "id": int(row[0]), "image_path": image}

    if "trabalhos" in pages:
        for row in cur.execute("SELECT id, image_path FROM gallery_item WHERE page_id=?", (pages["trabalhos"],)):
            image = (row[1] or "").strip()
            if image.startswith("src/images/trabalhos/"):
                name = basename(image)
                if name:
                    req[("trabalhos", name)] = {"entity": "gallery_item", "id": int(row[0]), "image_path": image}

    return req


def choose_candidate(rows: list[sqlite3.Row], name: str) -> sqlite3.Row | None:
    for row in rows:
        if (row["filename"] or "").strip().lower() == name.lower():
            return row
    for row in rows:
        if basename(row["file_path"]).lower() == name.lower():
            return row
    return rows[0] if rows else None


def unique_filename(cur: sqlite3.Cursor, folder: str, name: str) -> str:
    candidate = name
    if not cur.execute("SELECT 1 FROM media_file WHERE filename=?", (candidate,)).fetchone():
        return candidate

    stem, dot, ext = name.rpartition(".")
    stem = stem or name
    ext = f".{ext}" if dot else ""
    counter = 1
    while True:
        candidate = f"{folder}__{stem}__{counter}{ext}"
        if not cur.execute("SELECT 1 FROM media_file WHERE filename=?", (candidate,)).fetchone():
            return candidate
        counter += 1


def main() -> int:
    parser = argparse.ArgumentParser(description="Garante media_file por uso real em timeline/campus/territorio/trabalhos")
    parser.add_argument("--apply", action="store_true", help="Aplica mudanças no banco")
    args = parser.parse_args()

    if not DB_PATH.exists():
        raise SystemExit(f"Banco não encontrado: {DB_PATH}")

    changes: list[Change] = []

    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()

        requirements = usage_requirements(cur)
        media_rows = cur.execute(
            "SELECT id, filename, file_path, folder, file_size, mime_type, description, alt_text FROM media_file ORDER BY id"
        ).fetchall()

        by_name: dict[str, list[sqlite3.Row]] = {}
        by_path_base: dict[str, list[sqlite3.Row]] = {}
        for row in media_rows:
            by_name.setdefault((row["filename"] or "").strip().lower(), []).append(row)
            by_path_base.setdefault(basename(row["file_path"]).lower(), []).append(row)

        for (target_folder, name), source in sorted(requirements.items()):
            basename_marker = f"__basename__:{name.lower()}"
            stem, dot, ext = name.rpartition(".")
            stem = stem or name
            ext = f".{ext}" if dot else ""
            synthetic_pattern = f"{target_folder}__{stem}__%{ext}"

            existing_target = cur.execute(
                """
                SELECT id, filename, file_path, folder
                  FROM media_file
                 WHERE folder=?
                   AND (
                        LOWER(filename)=LOWER(?)
                        OR LOWER(filename) LIKE LOWER(?)
                        OR LOWER(file_path) LIKE ?
                        OR LOWER(COALESCE(alt_text,'')) = ?
                   )
                 ORDER BY id
                 LIMIT 1
                """,
                (target_folder, name, synthetic_pattern, f"%/{name}", basename_marker),
            ).fetchone()
            if existing_target:
                continue

            candidates: list[sqlite3.Row] = []
            candidates.extend(by_name.get(name.lower(), []))
            candidates.extend([r for r in by_path_base.get(name.lower(), []) if r not in candidates])
            candidate = choose_candidate(candidates, name)

            if candidate is None:
                changes.append(
                    Change(
                        "missing_candidate",
                        {
                            "target_folder": target_folder,
                            "name": name,
                            "source": source,
                        },
                    )
                )
                continue

            new_filename = unique_filename(cur, target_folder, name)
            details = {
                "target_folder": target_folder,
                "name": name,
                "source": source,
                "clone_from_media_id": int(candidate["id"]),
                "clone_from_filename": candidate["filename"],
                "clone_from_file_path": candidate["file_path"],
                "new_filename": new_filename,
                "new_file_path": candidate["file_path"],
            }
            changes.append(Change("insert_clone", details))

            if args.apply:
                alt_text = (candidate["alt_text"] or "").strip() or basename_marker
                cur.execute(
                    """
                    INSERT INTO media_file (filename, file_path, folder, file_size, mime_type, description, alt_text, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    """,
                    (
                        new_filename,
                        candidate["file_path"],
                        target_folder,
                        candidate["file_size"],
                        candidate["mime_type"],
                        candidate["description"],
                        alt_text,
                    ),
                )

        if args.apply:
            conn.commit()

        by_folder = {
            row[0]: int(row[1])
            for row in cur.execute("SELECT folder, COUNT(*) FROM media_file GROUP BY folder ORDER BY folder")
        }

    report = {
        "generated_at": datetime.now().isoformat(),
        "mode": "apply" if args.apply else "dry-run",
        "requirements_count": len(requirements),
        "changes_count": len(changes),
        "changes": [asdict(c) for c in changes],
        "media_by_folder_after": by_folder,
    }

    out_dir = REPORTS_ROOT / now_stamp()
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / "sync_media_registry_by_content_usage_report.json"
    out_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"Modo: {'APPLY' if args.apply else 'DRY-RUN'}")
    print(f"Requisitos: {len(requirements)}")
    print(f"Mudanças: {len(changes)}")
    print(f"Media por pasta: {by_folder}")
    print(f"Relatório: {out_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
