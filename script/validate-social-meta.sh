#!/usr/bin/env bash
# Lightweight check that Open Graph / Twitter tags are present in initial HTML (not client-only).
# Usage: ./script/validate-social-meta.sh [base-url]
set -euo pipefail

BASE="${1:-https://footballmad.co.uk}"
PATTERN='og:title|og:image|twitter:card|twitter:image|canonical|description'
CURL_CONNECT_TIMEOUT="${CURL_CONNECT_TIMEOUT:-10}"
CURL_MAX_TIME="${CURL_MAX_TIME:-30}"

check() {
  local path="$1"
  echo "==> ${BASE}${path}"
  if ! html="$(curl -fsSL --connect-timeout "${CURL_CONNECT_TIMEOUT}" --max-time "${CURL_MAX_TIME}" "${BASE}${path}")"; then
    echo "ERROR: curl failed for ${BASE}${path}" >&2
    return 1
  fi
  if ! printf '%s' "${html}" | grep -Ei "${PATTERN}" | head -20; then
    echo "ERROR: no social metadata matched pattern on ${path}" >&2
    return 1
  fi
  echo
}

check "/news/phil-foden-shines-as-man-city-keep-pressure-on-arsenal-with-crystal-palace-win"
check "/teams/arsenal"
check "/competitions/premier-league"
check "/"
echo "OK: social metadata present on sampled paths"
