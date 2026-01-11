#!/usr/bin/env bash
set -euo pipefail

DEFAULT_PATH="${SE_EPHE_PATH:-/usr/local/share/swisseph}"
TARGET_PATH="$DEFAULT_PATH"

ensure_dir() {
  local dir="$1"
  mkdir -p "$dir" 2>/dev/null
}

if ! ensure_dir "$TARGET_PATH"; then
  if command -v sudo >/dev/null 2>&1 && sudo -n true 2>/dev/null; then
    sudo mkdir -p "$TARGET_PATH"
    sudo chmod -R 755 "$TARGET_PATH"
  else
    TARGET_PATH="${XDG_DATA_HOME:-$HOME/.local/share}/swisseph"
    mkdir -p "$TARGET_PATH"
  fi
fi

export SE_EPHE_PATH="$TARGET_PATH"

echo "SE_EPHE_PATH set to $SE_EPHE_PATH"
