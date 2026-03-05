#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Uso: $0 <pasta_backup_ou_latest>"
  echo "Exemplo: $0 latest"
  exit 1
fi

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_ROOT="${PROJECT_DIR}/backups"
ARG="${1}"

restore_db() {
  local source_db="$1"
  local target_db="${PROJECT_DIR}/database/memoria.db"

  if cp "${source_db}" "${target_db}" 2>/dev/null; then
    echo "Banco restaurado (host)"
    return 0
  fi

  if docker ps --format '{{.Names}}' | grep -qx 'memoria-cms'; then
    docker cp "${source_db}" memoria-cms:/tmp/memoria-restore.db >/dev/null
    docker exec memoria-cms sh -lc 'cp /tmp/memoria-restore.db /app/database/memoria.db && rm -f /tmp/memoria-restore.db' >/dev/null
    echo "Banco restaurado (container memoria-cms)"
    return 0
  fi

  echo "Falha ao restaurar banco: sem permissão no host e container memoria-cms indisponível"
  return 1
}

restore_uploads() {
  local source_tar="$1"

  if tar -xzf "${source_tar}" -C "${PROJECT_DIR}" 2>/dev/null; then
    echo "Uploads restaurados (host)"
    return 0
  fi

  if docker ps --format '{{.Names}}' | grep -qx 'memoria-cms'; then
    docker cp "${source_tar}" memoria-cms:/tmp/uploads-restore.tar.gz >/dev/null
    docker exec memoria-cms sh -lc 'cd /app && tar -xzf /tmp/uploads-restore.tar.gz && rm -f /tmp/uploads-restore.tar.gz' >/dev/null
    echo "Uploads restaurados (container memoria-cms)"
    return 0
  fi

  echo "Falha ao restaurar uploads: sem permissão no host e container memoria-cms indisponível"
  return 1
}

if [[ "${ARG}" == "latest" ]]; then
  BACKUP_DIR="$(ls -1d "${BACKUP_ROOT}"/* 2>/dev/null | sort | tail -n 1 || true)"
else
  BACKUP_DIR="${ARG}"
  if [[ ! "${BACKUP_DIR}" = /* ]]; then
    BACKUP_DIR="${BACKUP_ROOT}/${BACKUP_DIR}"
  fi
fi

if [[ -z "${BACKUP_DIR}" || ! -d "${BACKUP_DIR}" ]]; then
  echo "Backup inválido: ${BACKUP_DIR}"
  exit 1
fi

if [[ -f "${BACKUP_DIR}/memoria.db" ]]; then
  restore_db "${BACKUP_DIR}/memoria.db"
fi

if [[ -f "${BACKUP_DIR}/uploads.tar.gz" ]]; then
  restore_uploads "${BACKUP_DIR}/uploads.tar.gz"
fi

echo "Restauração concluída: ${BACKUP_DIR}"
