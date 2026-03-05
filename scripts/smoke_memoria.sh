#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-https://ifva.duckdns.org/memoria}"

check_url() {
  local url="$1"
  local code
  code="$(curl -k -s -o /dev/null -w "%{http_code}" "$url")"
  if [[ "$code" != "200" ]]; then
    echo "FALHOU $url -> $code"
    return 1
  fi
  echo "OK     $url -> $code"
}

check_url "${BASE_URL}/api/health"
check_url "${BASE_URL}/"
check_url "${BASE_URL}/timeline"
check_url "${BASE_URL}/territorio"
check_url "${BASE_URL}/campus"
check_url "${BASE_URL}/trabalhos"
check_url "${BASE_URL}/catalogacao"
check_url "${BASE_URL}/contact"
check_url "${BASE_URL}/admin"

echo "Smoke concluído com sucesso"
