#!/usr/bin/env python3
from __future__ import annotations

import csv
import hashlib
import json
import re
import sqlite3
from collections import Counter, defaultdict
from dataclasses import asdict, dataclass
from datetime import datetime
from pathlib import Path
from typing import Any
from urllib.error import URLError, HTTPError
from urllib.request import Request, urlopen

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DB_PATH = PROJECT_ROOT / "database" / "memoria.db"
SRC_PATH = PROJECT_ROOT / "src"
IMAGES_PATH = SRC_PATH / "images"
REPORTS_ROOT = PROJECT_ROOT / "reports" / "reconciliation"

PRODUCTION_URLS = {
    "index": "https://memoriaifsulvenancio.com.br/",
    "timeline": "https://memoriaifsulvenancio.com.br/timeline.html",
    "territorio": "https://memoriaifsulvenancio.com.br/territorio.html",
    "campus": "https://memoriaifsulvenancio.com.br/campus.html",
    "trabalhos": "https://memoriaifsulvenancio.com.br/trabalhos.html",
    "publicacoes": "https://memoriaifsulvenancio.com.br/catalogacao.html",
}

CSV_SOURCES = {
    "timeline": SRC_PATH / "timeline.csv",
    "campus": SRC_PATH / "campus.csv",
    "territorio": SRC_PATH / "territorio.csv",
}


@dataclass
class PageSnapshot:
    slug: str
    url: str
    status: int | None
    title: str | None
    image_refs: list[str]
    h1: list[str]
    h2: list[str]
    h3: list[str]
    error: str | None


def now_stamp() -> str:
    return datetime.now().strftime("%Y%m%d-%H%M%S")


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def safe_text(value: Any) -> str:
    return ("" if value is None else str(value)).strip()


def fetch_url_snapshot(slug: str, url: str) -> PageSnapshot:
    req = Request(url, headers={"User-Agent": "memoria-reconciliation-audit/1.0"})
    try:
        with urlopen(req, timeout=20) as response:
            status = int(response.status)
            html = response.read().decode("utf-8", errors="replace")
    except HTTPError as err:
        return PageSnapshot(
            slug=slug,
            url=url,
            status=err.code,
            title=None,
            image_refs=[],
            h1=[],
            h2=[],
            h3=[],
            error=f"HTTPError: {err}",
        )
    except URLError as err:
        return PageSnapshot(
            slug=slug,
            url=url,
            status=None,
            title=None,
            image_refs=[],
            h1=[],
            h2=[],
            h3=[],
            error=f"URLError: {err}",
        )

    title_match = re.search(r"<title>(.*?)</title>", html, flags=re.IGNORECASE | re.DOTALL)
    title = title_match.group(1).strip() if title_match else None

    def extract_tags(tag: str) -> list[str]:
        pattern = rf"<{tag}[^>]*>(.*?)</{tag}>"
        values = []
        for raw in re.findall(pattern, html, flags=re.IGNORECASE | re.DOTALL):
            txt = re.sub(r"<[^>]+>", "", raw)
            txt = re.sub(r"\s+", " ", txt).strip()
            if txt:
                values.append(txt)
        return values

    refs = re.findall(r"(?:src|href)=['\"]([^'\"]*src/images/[^'\"]+)['\"]", html, flags=re.IGNORECASE)

    return PageSnapshot(
        slug=slug,
        url=url,
        status=status,
        title=title,
        image_refs=sorted(set(refs)),
        h1=extract_tags("h1"),
        h2=extract_tags("h2"),
        h3=extract_tags("h3"),
        error=None,
    )


def load_csv_manifest(csv_path: Path, page_slug: str) -> dict[str, Any]:
    if not csv_path.exists():
        return {
            "page": page_slug,
            "exists": False,
            "rows": [],
            "summary": {"count": 0, "image_prefixes": {}},
        }

    rows: list[dict[str, Any]] = []
    with csv_path.open("r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for index, row in enumerate(reader, start=1):
            image = safe_text(row.get("image"))
            image_path = f"src/images/{page_slug}/{image}" if page_slug in {"campus", "territorio"} and image else (
                f"src/images/{image}" if page_slug == "timeline" and image else image
            )
            rows.append(
                {
                    "order": index,
                    "date": safe_text(row.get("date")),
                    "title": safe_text(row.get("title")),
                    "image": image,
                    "expected_image_path": image_path,
                    "legend": safe_text(row.get("legend")),
                    "text": safe_text(row.get("text")),
                }
            )

    prefixes = Counter()
    for item in rows:
        p = item["expected_image_path"]
        if p.startswith("src/images/campus/"):
            prefixes["src/images/campus/"] += 1
        elif p.startswith("src/images/territorio/"):
            prefixes["src/images/territorio/"] += 1
        elif p.startswith("src/images/"):
            prefixes["src/images/"] += 1
        elif not p:
            prefixes["<empty>"] += 1
        else:
            prefixes[p.split("/")[0]] += 1

    return {
        "page": page_slug,
        "exists": True,
        "rows": rows,
        "summary": {"count": len(rows), "image_prefixes": dict(prefixes)},
    }


def load_local_db_manifest(conn: sqlite3.Connection) -> dict[str, Any]:
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    pages = cur.execute("SELECT id, slug, title, type FROM page ORDER BY id").fetchall()
    page_map = {r["slug"]: r["id"] for r in pages}

    counts = {}
    for table_name in ["page", "timeline_item", "card_item", "gallery_item", "media_file", "menu_item", "content_history"]:
        counts[table_name] = cur.execute(f"SELECT COUNT(*) FROM {table_name}").fetchone()[0]

    timeline_rows = [dict(r) for r in cur.execute(
        "SELECT id, page_id, title, date, image_path, source, description, order_index FROM timeline_item ORDER BY order_index, id"
    ).fetchall()]

    card_rows = [dict(r) for r in cur.execute(
        "SELECT id, page_id, title, description, image_path, date_label, source, order_index FROM card_item ORDER BY order_index, id"
    ).fetchall()]

    gallery_rows = [dict(r) for r in cur.execute(
        "SELECT id, page_id, title, caption, image_path, order_index FROM gallery_item ORDER BY order_index, id"
    ).fetchall()]

    media_rows = [dict(r) for r in cur.execute(
        "SELECT id, filename, file_path, folder, file_size, mime_type, description, alt_text FROM media_file ORDER BY id"
    ).fetchall()]

    media_by_folder = Counter(r["folder"] for r in media_rows)

    page_distribution: dict[str, dict[str, int]] = {}
    for slug, page_id in page_map.items():
        page_distribution[slug] = {
            "timeline_item": cur.execute("SELECT COUNT(*) FROM timeline_item WHERE page_id=?", (page_id,)).fetchone()[0],
            "card_item": cur.execute("SELECT COUNT(*) FROM card_item WHERE page_id=?", (page_id,)).fetchone()[0],
            "gallery_item": cur.execute("SELECT COUNT(*) FROM gallery_item WHERE page_id=?", (page_id,)).fetchone()[0],
        }

    return {
        "tables": counts,
        "pages": [dict(r) for r in pages],
        "page_distribution": page_distribution,
        "timeline_items": timeline_rows,
        "card_items": card_rows,
        "gallery_items": gallery_rows,
        "media_files": media_rows,
        "media_by_folder": dict(media_by_folder),
    }


def compute_discrepancies(local_db: dict[str, Any], truth_csv: dict[str, Any]) -> dict[str, Any]:
    media_rows = local_db["media_files"]
    media_file_paths = {safe_text(row["file_path"]) for row in media_rows}
    media_filenames = {safe_text(row["filename"]) for row in media_rows}

    timeline_items = local_db["timeline_items"]
    timeline_expected = truth_csv.get("timeline", {}).get("rows", [])

    def basename(path: str) -> str:
        p = safe_text(path)
        if not p:
            return ""
        return p.split("/")[-1]

    timeline_db_images = [safe_text(item.get("image_path")) for item in timeline_items if safe_text(item.get("image_path"))]
    timeline_db_basenames = {basename(p) for p in timeline_db_images if basename(p)}

    missing_media_for_timeline = sorted([name for name in timeline_db_basenames if name not in media_filenames])

    truth_expected_timeline_paths = {
        safe_text(item.get("expected_image_path"))
        for item in timeline_expected
        if safe_text(item.get("expected_image_path"))
    }
    db_timeline_paths = set(timeline_db_images)

    timeline_missing_in_db = sorted(truth_expected_timeline_paths - db_timeline_paths)
    timeline_extra_in_db = sorted(db_timeline_paths - truth_expected_timeline_paths)

    image_root_files = sorted([p.name for p in IMAGES_PATH.glob("*") if p.is_file()])
    non_timeline_root_files = {
        "header.jpg",
        "logo-horizontal.png",
        "05-de-novembro-de-2021-01-ifsul-1024x682.jpg",
    }
    timeline_like_root_files = sorted([name for name in image_root_files if name not in non_timeline_root_files])
    image_folders = {
        "campus": sorted([p.name for p in (IMAGES_PATH / "campus").glob("*") if p.is_file()]),
        "territorio": sorted([p.name for p in (IMAGES_PATH / "territorio").glob("*") if p.is_file()]),
        "trabalhos": sorted([p.name for p in (IMAGES_PATH / "trabalhos").glob("*") if p.is_file()]),
        "timeline": sorted([p.name for p in (IMAGES_PATH / "timeline").glob("*") if p.is_file()]),
    }

    expected_media_file_paths = set()
    for folder, files in image_folders.items():
        if folder == "timeline":
            continue
        for name in files:
            expected_media_file_paths.add(f"{folder}/{name}")

    missing_expected_media_entries = sorted(
        [p for p in expected_media_file_paths if p not in media_file_paths]
    )

    media_by_filename: dict[str, dict[str, Any]] = {
        safe_text(item.get("filename")): item for item in media_rows
    }
    timeline_misclassified = []
    timeline_missing = []
    for filename in timeline_like_root_files:
        media = media_by_filename.get(filename)
        if not media:
            timeline_missing.append(filename)
            continue
        folder = safe_text(media.get("folder"))
        if folder != "timeline":
            timeline_misclassified.append(
                {
                    "filename": filename,
                    "folder": folder,
                    "file_path": safe_text(media.get("file_path")),
                    "id": media.get("id"),
                }
            )

    high_risk_findings = []
    if timeline_misclassified:
        high_risk_findings.append(
            "Arquivos de timeline no root src/images estão registrados em pastas incorretas no media_file"
        )
    if missing_media_for_timeline:
        high_risk_findings.append(
            "timeline_item usa imagens src/images/* sem registro correspondente por filename em media_file"
        )
    if not high_risk_findings:
        high_risk_findings.append("nenhuma")

    return {
        "high_risk_findings": high_risk_findings,
        "timeline": {
            "db_count": len(timeline_items),
            "truth_csv_count": len(timeline_expected),
            "db_image_paths_count": len(db_timeline_paths),
            "truth_expected_paths_count": len(truth_expected_timeline_paths),
            "missing_media_entries_by_filename": missing_media_for_timeline,
            "missing_paths_in_db_vs_csv": timeline_missing_in_db,
            "extra_paths_in_db_vs_csv": timeline_extra_in_db,
            "timeline_like_root_files_count": len(timeline_like_root_files),
            "misclassified_media_count": len(timeline_misclassified),
            "misclassified_media_samples": timeline_misclassified[:20],
            "missing_timeline_files_in_media": timeline_missing,
        },
        "media": {
            "media_by_folder": local_db.get("media_by_folder", {}),
            "src_images_root_file_count": len(image_root_files),
            "src_images_subfolder_file_count": {k: len(v) for k, v in image_folders.items()},
            "missing_expected_media_entries": missing_expected_media_entries,
        },
    }


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def main() -> int:
    if not DB_PATH.exists():
        raise SystemExit(f"Banco não encontrado: {DB_PATH}")

    stamp = now_stamp()
    out_dir = REPORTS_ROOT / stamp
    out_dir.mkdir(parents=True, exist_ok=True)

    with sqlite3.connect(DB_PATH) as conn:
        local_db_manifest = load_local_db_manifest(conn)

    truth_csv_manifest = {
        slug: load_csv_manifest(path, slug)
        for slug, path in CSV_SOURCES.items()
    }

    prod_snapshots = [asdict(fetch_url_snapshot(slug, url)) for slug, url in PRODUCTION_URLS.items()]

    db_hash = sha256_file(DB_PATH)
    summary = {
        "generated_at": datetime.now().isoformat(),
        "project_root": str(PROJECT_ROOT),
        "db_path": str(DB_PATH),
        "db_sha256": db_hash,
        "reports_dir": str(out_dir),
    }

    discrepancies = compute_discrepancies(local_db_manifest, truth_csv_manifest)

    write_json(out_dir / "summary.json", summary)
    write_json(out_dir / "truth_manifest_csv.json", truth_csv_manifest)
    write_json(out_dir / "local_manifest_db.json", local_db_manifest)
    write_json(out_dir / "production_snapshot.json", prod_snapshots)
    write_json(out_dir / "discrepancies.json", discrepancies)

    print(f"Audit gerado em: {out_dir}")
    print("Arquivos:")
    for name in [
        "summary.json",
        "truth_manifest_csv.json",
        "local_manifest_db.json",
        "production_snapshot.json",
        "discrepancies.json",
    ]:
        print(f"- {name}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
