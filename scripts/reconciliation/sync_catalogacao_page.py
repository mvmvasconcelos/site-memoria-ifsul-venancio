#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import re
import sqlite3
from dataclasses import asdict, dataclass
from datetime import datetime
from pathlib import Path
from urllib.request import Request, urlopen

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DB_PATH = PROJECT_ROOT / "database" / "memoria.db"
REPORTS_ROOT = PROJECT_ROOT / "reports" / "reconciliation"
CATALOGACAO_URL = "https://memoriaifsulvenancio.com.br/catalogacao.html"


@dataclass
class Change:
    entity: str
    action: str
    details: dict


def now_stamp() -> str:
    return datetime.now().strftime("%Y%m%d-%H%M%S")


def fetch_main_html(url: str) -> str:
    req = Request(url, headers={"User-Agent": "memoria-sync-catalogacao/1.0"})
    with urlopen(req, timeout=20) as response:
        html = response.read().decode("utf-8", errors="replace")

    match = re.search(r"<main[^>]*>(.*?)</main>", html, flags=re.IGNORECASE | re.DOTALL)
    if not match:
        raise RuntimeError("Não foi possível extrair <main> da página de catalogação")

    content = match.group(1).strip()
    return content


def ensure_page(cur: sqlite3.Cursor, content: str, apply: bool) -> tuple[int | None, list[Change]]:
    changes: list[Change] = []
    page = cur.execute("SELECT id, title, type, content, is_visible, menu_order FROM page WHERE slug='catalogacao'").fetchone()

    expected = {
        "title": "Publicações em Jornais",
        "type": "page",
        "content": content,
        "is_visible": 1,
        "menu_order": 5,
    }

    if page is None:
        changes.append(Change("page", "insert", {"slug": "catalogacao", **expected}))
        if apply:
            cur.execute(
                """
                INSERT INTO page (slug, title, type, content, is_visible, menu_order, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                """,
                ("catalogacao", expected["title"], expected["type"], expected["content"], expected["is_visible"], expected["menu_order"]),
            )
            page_id = int(cur.lastrowid)
        else:
            page_id = None
    else:
        page_id = int(page[0])
        updates = {}
        if page[1] != expected["title"]:
            updates["title"] = {"from": page[1], "to": expected["title"]}
        if page[2] != expected["type"]:
            updates["type"] = {"from": page[2], "to": expected["type"]}
        if (page[3] or "").strip() != expected["content"]:
            updates["content"] = {"from_len": len(page[3] or ""), "to_len": len(expected["content"])}
        if int(page[4]) != expected["is_visible"]:
            updates["is_visible"] = {"from": int(page[4]), "to": expected["is_visible"]}
        if int(page[5]) != expected["menu_order"]:
            updates["menu_order"] = {"from": int(page[5]), "to": expected["menu_order"]}

        if updates:
            changes.append(Change("page", "update", {"id": page_id, "updates": updates}))
            if apply:
                cur.execute(
                    """
                    UPDATE page
                       SET title=?, type=?, content=?, is_visible=?, menu_order=?, updated_at=CURRENT_TIMESTAMP
                     WHERE id=?
                    """,
                    (expected["title"], expected["type"], expected["content"], expected["is_visible"], expected["menu_order"], page_id),
                )

    return page_id, changes


def ensure_menu(cur: sqlite3.Cursor, page_id: int | None, apply: bool) -> list[Change]:
    changes: list[Change] = []

    page_id_for_link = page_id
    if page_id_for_link is None:
        row = cur.execute("SELECT id FROM page WHERE slug='catalogacao'").fetchone()
        page_id_for_link = int(row[0]) if row else None

    if page_id_for_link is None:
        if not apply:
            changes.append(
                Change(
                    "menu_item",
                    "insert",
                    {
                        "page_id": "<pending page insert>",
                        "label": "Publicações em Jornais",
                        "url": "/catalogacao",
                        "is_visible": 1,
                        "order_index": 5,
                    },
                )
            )
            return changes
        raise RuntimeError("Não foi possível determinar page_id de catalogacao")

    existing = cur.execute(
        "SELECT id, page_id, label, url, is_visible, order_index FROM menu_item WHERE url='/catalogacao' OR page_id=? ORDER BY id LIMIT 1",
        (page_id_for_link,),
    ).fetchone()

    expected = {
        "page_id": page_id_for_link,
        "label": "Publicações em Jornais",
        "url": "/catalogacao",
        "is_visible": 1,
        "order_index": 5,
    }

    if existing is None:
        changes.append(Change("menu_item", "insert", expected))
        if apply:
            cur.execute(
                """
                INSERT INTO menu_item (page_id, label, url, is_visible, order_index, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                """,
                (expected["page_id"], expected["label"], expected["url"], expected["is_visible"], expected["order_index"]),
            )
    else:
        menu_id = int(existing[0])
        updates = {}
        if int(existing[1] or 0) != expected["page_id"]:
            updates["page_id"] = {"from": existing[1], "to": expected["page_id"]}
        if existing[2] != expected["label"]:
            updates["label"] = {"from": existing[2], "to": expected["label"]}
        if existing[3] != expected["url"]:
            updates["url"] = {"from": existing[3], "to": expected["url"]}
        if int(existing[4]) != expected["is_visible"]:
            updates["is_visible"] = {"from": int(existing[4]), "to": expected["is_visible"]}
        if int(existing[5]) != expected["order_index"]:
            updates["order_index"] = {"from": int(existing[5]), "to": expected["order_index"]}

        if updates:
            changes.append(Change("menu_item", "update", {"id": menu_id, "updates": updates}))
            if apply:
                cur.execute(
                    """
                    UPDATE menu_item
                       SET page_id=?, label=?, url=?, is_visible=?, order_index=?, updated_at=CURRENT_TIMESTAMP
                     WHERE id=?
                    """,
                    (expected["page_id"], expected["label"], expected["url"], expected["is_visible"], expected["order_index"], menu_id),
                )

    # Move contato para depois de publicações, se existir
    contact = cur.execute("SELECT id, order_index FROM menu_item WHERE url='/contact' ORDER BY id LIMIT 1").fetchone()
    if contact and int(contact[1]) <= 5:
        changes.append(Change("menu_item", "update", {"id": int(contact[0]), "updates": {"order_index": {"from": int(contact[1]), "to": 6}}}))
        if apply:
            cur.execute(
                "UPDATE menu_item SET order_index=6, updated_at=CURRENT_TIMESTAMP WHERE id=?",
                (int(contact[0]),),
            )

    return changes


def write_report(report: dict) -> Path:
    out_dir = REPORTS_ROOT / now_stamp()
    out_dir.mkdir(parents=True, exist_ok=True)
    path = out_dir / "sync_catalogacao_report.json"
    path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    return path


def main() -> int:
    parser = argparse.ArgumentParser(description="Sincroniza página catalogacao (publicações) no DB")
    parser.add_argument("--apply", action="store_true", help="Aplica alterações no banco")
    args = parser.parse_args()

    if not DB_PATH.exists():
        raise SystemExit(f"Banco não encontrado: {DB_PATH}")

    content = fetch_main_html(CATALOGACAO_URL)

    changes: list[Change] = []
    with sqlite3.connect(DB_PATH) as conn:
        cur = conn.cursor()
        page_id, page_changes = ensure_page(cur, content, apply=args.apply)
        changes.extend(page_changes)
        menu_changes = ensure_menu(cur, page_id, apply=args.apply)
        changes.extend(menu_changes)

        if args.apply:
            conn.commit()

    report = {
        "generated_at": datetime.now().isoformat(),
        "mode": "apply" if args.apply else "dry-run",
        "source_url": CATALOGACAO_URL,
        "content_length": len(content),
        "changes_count": len(changes),
        "changes": [asdict(c) for c in changes],
    }
    report_path = write_report(report)

    print(f"Modo: {'APPLY' if args.apply else 'DRY-RUN'}")
    print(f"Alterações planejadas: {len(changes)}")
    print(f"Relatório: {report_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
