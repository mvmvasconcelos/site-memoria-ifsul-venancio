#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
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
    entity: str
    action: str
    details: dict


def now_stamp() -> str:
    return datetime.now().strftime("%Y%m%d-%H%M%S")


def load_csv_rows(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def normalize(value: str | None) -> str | None:
    raw = (value or "").strip()
    return raw or None


def sync_timeline(cur: sqlite3.Cursor, page_id: int, apply: bool) -> list[Change]:
    changes: list[Change] = []
    csv_rows = load_csv_rows(PROJECT_ROOT / "src" / "timeline.csv")
    db_rows = cur.execute(
        "SELECT id, title, date, image_path, source, description, order_index FROM timeline_item WHERE page_id=? ORDER BY order_index ASC, id ASC",
        (page_id,),
    ).fetchall()

    for index, csv_row in enumerate(csv_rows):
        expected = {
            "title": normalize(csv_row.get("title")) or "",
            "date": normalize(csv_row.get("date")) or "",
            "image_path": (
                f"src/images/{normalize(csv_row.get('image'))}" if normalize(csv_row.get("image")) else None
            ),
            "source": normalize(csv_row.get("legend")),
            "description": normalize(csv_row.get("text")),
            "order_index": index,
        }

        if index < len(db_rows):
            row = db_rows[index]
            current = {
                "title": row[1] or "",
                "date": row[2] or "",
                "image_path": normalize(row[3]),
                "source": normalize(row[4]),
                "description": normalize(row[5]),
                "order_index": int(row[6] or 0),
            }

            updates = {}
            for key in expected:
                if current[key] != expected[key]:
                    updates[key] = {"from": current[key], "to": expected[key]}

            if updates:
                changes.append(Change("timeline_item", "update", {"id": int(row[0]), "updates": updates}))
                if apply:
                    cur.execute(
                        """
                        UPDATE timeline_item
                           SET title=?, date=?, image_path=?, source=?, description=?, order_index=?, updated_at=CURRENT_TIMESTAMP
                         WHERE id=?
                        """,
                        (
                            expected["title"],
                            expected["date"],
                            expected["image_path"],
                            expected["source"],
                            expected["description"],
                            expected["order_index"],
                            int(row[0]),
                        ),
                    )
        else:
            changes.append(Change("timeline_item", "insert", {"page_id": page_id, **expected}))
            if apply:
                cur.execute(
                    """
                    INSERT INTO timeline_item (page_id, title, date, image_path, source, description, order_index, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    """,
                    (
                        page_id,
                        expected["title"],
                        expected["date"],
                        expected["image_path"],
                        expected["source"],
                        expected["description"],
                        expected["order_index"],
                    ),
                )

    if len(db_rows) > len(csv_rows):
        for row in db_rows[len(csv_rows):]:
            changes.append(Change("timeline_item", "delete", {"id": int(row[0])}))
            if apply:
                cur.execute("DELETE FROM timeline_item WHERE id=?", (int(row[0]),))

    return changes


def sync_cards(cur: sqlite3.Cursor, page_id: int, slug: str, apply: bool) -> list[Change]:
    changes: list[Change] = []
    csv_rows = load_csv_rows(PROJECT_ROOT / "src" / f"{slug}.csv")
    db_rows = cur.execute(
        "SELECT id, title, description, image_path, date_label, source, order_index FROM card_item WHERE page_id=? ORDER BY order_index ASC, id ASC",
        (page_id,),
    ).fetchall()

    prefix = "src/images/campus/" if slug == "campus" else "src/images/territorio/"

    for index, csv_row in enumerate(csv_rows):
        expected = {
            "title": normalize(csv_row.get("title")) or "",
            "description": normalize(csv_row.get("text")),
            "image_path": (
                f"{prefix}{normalize(csv_row.get('image'))}" if normalize(csv_row.get("image")) else None
            ),
            "date_label": normalize(csv_row.get("date")),
            "source": normalize(csv_row.get("legend")),
            "order_index": index,
        }

        if index < len(db_rows):
            row = db_rows[index]
            current = {
                "title": row[1] or "",
                "description": normalize(row[2]),
                "image_path": normalize(row[3]),
                "date_label": normalize(row[4]),
                "source": normalize(row[5]),
                "order_index": int(row[6] or 0),
            }

            updates = {}
            for key in expected:
                if current[key] != expected[key]:
                    updates[key] = {"from": current[key], "to": expected[key]}

            if updates:
                changes.append(Change("card_item", "update", {"id": int(row[0]), "page": slug, "updates": updates}))
                if apply:
                    cur.execute(
                        """
                        UPDATE card_item
                           SET title=?, description=?, image_path=?, date_label=?, source=?, order_index=?, updated_at=CURRENT_TIMESTAMP
                         WHERE id=?
                        """,
                        (
                            expected["title"],
                            expected["description"],
                            expected["image_path"],
                            expected["date_label"],
                            expected["source"],
                            expected["order_index"],
                            int(row[0]),
                        ),
                    )
        else:
            changes.append(Change("card_item", "insert", {"page_id": page_id, "page": slug, **expected}))
            if apply:
                cur.execute(
                    """
                    INSERT INTO card_item (page_id, title, description, image_path, date_label, source, order_index, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    """,
                    (
                        page_id,
                        expected["title"],
                        expected["description"],
                        expected["image_path"],
                        expected["date_label"],
                        expected["source"],
                        expected["order_index"],
                    ),
                )

    if len(db_rows) > len(csv_rows):
        for row in db_rows[len(csv_rows):]:
            changes.append(Change("card_item", "delete", {"id": int(row[0]), "page": slug}))
            if apply:
                cur.execute("DELETE FROM card_item WHERE id=?", (int(row[0]),))

    return changes


def main() -> int:
    parser = argparse.ArgumentParser(description="Sincroniza timeline/campus/territorio a partir dos CSVs canônicos")
    parser.add_argument("--apply", action="store_true", help="Aplica alterações no banco")
    args = parser.parse_args()

    if not DB_PATH.exists():
        raise SystemExit(f"Banco não encontrado: {DB_PATH}")

    with sqlite3.connect(DB_PATH) as conn:
        cur = conn.cursor()
        pages = {row[1]: int(row[0]) for row in cur.execute("SELECT id, slug FROM page")}

        required = ["timeline", "campus", "territorio"]
        missing_pages = [slug for slug in required if slug not in pages]
        if missing_pages:
            raise RuntimeError(f"Páginas ausentes no banco: {missing_pages}")

        changes: list[Change] = []
        changes.extend(sync_timeline(cur, pages["timeline"], apply=args.apply))
        changes.extend(sync_cards(cur, pages["campus"], "campus", apply=args.apply))
        changes.extend(sync_cards(cur, pages["territorio"], "territorio", apply=args.apply))

        if args.apply:
            conn.commit()

    report = {
        "generated_at": datetime.now().isoformat(),
        "mode": "apply" if args.apply else "dry-run",
        "changes_count": len(changes),
        "changes": [asdict(c) for c in changes],
    }

    out_dir = REPORTS_ROOT / now_stamp()
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / "sync_structured_content_report.json"
    out_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"Modo: {'APPLY' if args.apply else 'DRY-RUN'}")
    print(f"Alterações: {len(changes)}")
    print(f"Relatório: {out_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
