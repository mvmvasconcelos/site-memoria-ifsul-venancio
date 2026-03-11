#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import shutil
import sqlite3
from dataclasses import dataclass, asdict
from datetime import datetime
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DB_PATH = PROJECT_ROOT / "database" / "memoria.db"
UPLOADS_PATH = PROJECT_ROOT / "uploads"
SRC_IMAGES_PATH = PROJECT_ROOT / "src" / "images"
REPORTS_ROOT = PROJECT_ROOT / "reports" / "reconciliation"

NON_TIMELINE_ROOT_FILES = {
    "header.jpg",
    "logo-horizontal.png",
    "05-de-novembro-de-2021-01-ifsul-1024x682.jpg",
}


@dataclass
class Action:
    media_id: int
    filename: str
    old_folder: str
    old_file_path: str
    new_folder: str
    new_file_path: str
    file_exists: bool
    move_needed: bool


def now_stamp() -> str:
    return datetime.now().strftime("%Y%m%d-%H%M%S")


def build_timeline_filenames() -> set[str]:
    files = [p.name for p in SRC_IMAGES_PATH.glob("*") if p.is_file()]
    return {name for name in files if name not in NON_TIMELINE_ROOT_FILES}


def plan_actions(conn: sqlite3.Connection, timeline_filenames: set[str]) -> list[Action]:
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    rows = cur.execute(
        "SELECT id, filename, folder, file_path FROM media_file ORDER BY id"
    ).fetchall()

    actions: list[Action] = []
    for row in rows:
        filename = (row["filename"] or "").strip()
        if filename not in timeline_filenames:
            continue

        old_folder = (row["folder"] or "").strip()
        old_file_path = (row["file_path"] or "").strip()

        if not old_file_path:
            continue

        generated = old_file_path.split("/")[-1]
        new_file_path = f"timeline/{generated}"

        src_file = UPLOADS_PATH / old_file_path
        dst_file = UPLOADS_PATH / new_file_path
        move_needed = old_file_path != new_file_path

        actions.append(
            Action(
                media_id=int(row["id"]),
                filename=filename,
                old_folder=old_folder,
                old_file_path=old_file_path,
                new_folder="timeline",
                new_file_path=new_file_path,
                file_exists=src_file.exists() or dst_file.exists(),
                move_needed=move_needed,
            )
        )

    return actions


def apply_actions(conn: sqlite3.Connection, actions: list[Action], move_files: bool) -> dict[str, int]:
    cur = conn.cursor()
    moved_files = 0
    updated_rows = 0

    if move_files:
        (UPLOADS_PATH / "timeline").mkdir(parents=True, exist_ok=True)

    for action in actions:
        src_file = UPLOADS_PATH / action.old_file_path
        dst_file = UPLOADS_PATH / action.new_file_path

        if move_files and action.move_needed and src_file.exists() and src_file.resolve() != dst_file.resolve():
            dst_file.parent.mkdir(parents=True, exist_ok=True)
            if not dst_file.exists():
                shutil.move(str(src_file), str(dst_file))
                moved_files += 1

        final_file_path = action.new_file_path if move_files else action.old_file_path

        cur.execute(
            """
            UPDATE media_file
               SET folder = ?,
                   file_path = ?,
                   updated_at = CURRENT_TIMESTAMP
             WHERE id = ?
            """,
            (action.new_folder, final_file_path, action.media_id),
        )
        updated_rows += cur.rowcount

    conn.commit()
    return {"updated_rows": updated_rows, "moved_files": moved_files}


def write_report(report_dir: Path, payload: dict) -> Path:
    report_dir.mkdir(parents=True, exist_ok=True)
    report_path = report_dir / "timeline_media_reclassification_report.json"
    report_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    return report_path


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Reclassifica mídias da timeline no media_file (com dry-run por padrão)."
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Aplica as mudanças no banco e move arquivos em uploads.",
    )
    parser.add_argument(
        "--move-files",
        action="store_true",
        help="Move arquivos físicos para uploads/timeline (requer permissão de escrita no host).",
    )
    args = parser.parse_args()

    if not DB_PATH.exists():
        raise SystemExit(f"Banco não encontrado: {DB_PATH}")

    timeline_filenames = build_timeline_filenames()
    with sqlite3.connect(DB_PATH) as conn:
        actions = plan_actions(conn, timeline_filenames)

        payload = {
            "generated_at": datetime.now().isoformat(),
            "db_path": str(DB_PATH),
            "uploads_path": str(UPLOADS_PATH),
            "mode": "apply" if args.apply else "dry-run",
            "move_files": bool(args.move_files),
            "timeline_candidate_filenames": len(timeline_filenames),
            "planned_actions": len(actions),
            "actions": [asdict(a) for a in actions],
        }

        if args.apply:
            stats = apply_actions(conn, actions, move_files=bool(args.move_files))
            payload["apply_stats"] = stats

    report_dir = REPORTS_ROOT / now_stamp()
    report_path = write_report(report_dir, payload)

    print(f"Modo: {'APPLY' if args.apply else 'DRY-RUN'}")
    print(f"Mover arquivos físicos: {'SIM' if args.move_files else 'NÃO (DB-only)'}")
    print(f"Ações planejadas: {len(actions)}")
    if args.apply:
        print(f"Linhas atualizadas: {payload['apply_stats']['updated_rows']}")
        print(f"Arquivos movidos: {payload['apply_stats']['moved_files']}")
    print(f"Relatório: {report_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
