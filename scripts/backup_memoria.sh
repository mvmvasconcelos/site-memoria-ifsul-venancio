#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DB_FILE="${PROJECT_DIR}/database/memoria.db"
UPLOADS_DIR="${PROJECT_DIR}/uploads"
BACKUP_DIR="${PROJECT_DIR}/backups"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
TARGET_DIR="${BACKUP_DIR}/${TIMESTAMP}"

mkdir -p "${TARGET_DIR}"

if [[ -f "${DB_FILE}" ]]; then
  cp "${DB_FILE}" "${TARGET_DIR}/memoria.db"
fi

if [[ -d "${UPLOADS_DIR}" ]]; then
  tar -czf "${TARGET_DIR}/uploads.tar.gz" -C "${PROJECT_DIR}" uploads
fi

cat > "${TARGET_DIR}/manifest.txt" <<EOF
timestamp=${TIMESTAMP}
project_dir=${PROJECT_DIR}
db_present=$([[ -f "${DB_FILE}" ]] && echo yes || echo no)
uploads_present=$([[ -d "${UPLOADS_DIR}" ]] && echo yes || echo no)
EOF

echo "Backup concluído: ${TARGET_DIR}"
