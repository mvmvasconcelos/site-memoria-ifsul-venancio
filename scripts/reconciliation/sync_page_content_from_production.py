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

PAGE_SOURCES = {
    "index": "https://memoriaifsulvenancio.com.br/",
    "contact": "https://memoriaifsulvenancio.com.br/contact.html",
    "catalogacao": "https://memoriaifsulvenancio.com.br/catalogacao.html",
}


@dataclass
class Change:
    slug: str
    action: str
    details: dict


def now_stamp() -> str:
    return datetime.now().strftime("%Y%m%d-%H%M%S")


def fetch_main_html(url: str) -> str:
    req = Request(url, headers={"User-Agent": "memoria-sync-pages/1.0"})
    with urlopen(req, timeout=20) as response:
        html = response.read().decode("utf-8", errors="replace")

    match = re.search(r"<main[^>]*>(.*?)</main>", html, flags=re.IGNORECASE | re.DOTALL)
    if not match:
        raise RuntimeError(f"Não foi possível extrair <main> de {url}")
    return match.group(1).strip()


def main() -> int:
    parser = argparse.ArgumentParser(description="Sincroniza page.content com produção para páginas estáticas")
    parser.add_argument("--apply", action="store_true", help="Aplica alterações no banco")
    args = parser.parse_args()

    if not DB_PATH.exists():
        raise SystemExit(f"Banco não encontrado: {DB_PATH}")

    fetched = {slug: fetch_main_html(url) for slug, url in PAGE_SOURCES.items()}

    changes: list[Change] = []
    with sqlite3.connect(DB_PATH) as conn:
        cur = conn.cursor()
        for slug, content in fetched.items():
            row = cur.execute("SELECT id, COALESCE(content,'') FROM page WHERE slug=?", (slug,)).fetchone()
            if not row:
                changes.append(Change(slug, "skip_missing_page", {"reason": "slug inexistente no banco"}))
                continue

            page_id, current_content = int(row[0]), row[1] or ""
            if current_content == content:
                continue

            changes.append(
                Change(
                    slug,
                    "update_content",
                    {
                        "page_id": page_id,
                        "from_len": len(current_content),
                        "to_len": len(content),
                    },
                )
            )

            if args.apply:
                cur.execute(
                    "UPDATE page SET content=?, updated_at=CURRENT_TIMESTAMP WHERE id=?",
                    (content, page_id),
                )

        if args.apply:
            conn.commit()

    report = {
        "generated_at": datetime.now().isoformat(),
        "mode": "apply" if args.apply else "dry-run",
        "sources": PAGE_SOURCES,
        "changes_count": len(changes),
        "changes": [asdict(c) for c in changes],
    }

    out_dir = REPORTS_ROOT / now_stamp()
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / "sync_page_content_report.json"
    out_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"Modo: {'APPLY' if args.apply else 'DRY-RUN'}")
    print(f"Alterações: {len(changes)}")
    print(f"Relatório: {out_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
