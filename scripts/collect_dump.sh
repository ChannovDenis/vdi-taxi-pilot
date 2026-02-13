#!/bin/bash
# collect_dump.sh — Collect session artifacts from a VDI VM.
#
# Usage: ./collect_dump.sh <session_id> <chrome_profile>
#
# Collects:
#   - Chrome History (tabs, downloads)
#   - Clipboard content (xclip)
#   - Screenshot (scrot)
#   - Downloads folder listing
#   - Metadata JSON
#
# Outputs: /tmp/session_<id>_dump.tar.gz + _meta.json

set -euo pipefail

SESSION_ID="${1:?Usage: $0 <session_id> <chrome_profile>}"
CHROME_PROFILE="${2:-Default}"

DUMP_DIR="/tmp/session_${SESSION_ID}_dump"
ARCHIVE="/tmp/session_${SESSION_ID}_dump.tar.gz"
META_FILE="/tmp/session_${SESSION_ID}_dump_meta.json"

# Clean up previous dump
rm -rf "$DUMP_DIR" "$ARCHIVE" "$META_FILE"
mkdir -p "$DUMP_DIR"

echo "[dump] Collecting session ${SESSION_ID} artifacts..."

# ── 1. Chrome History (tabs + downloads) ──
HISTORY_DB="$HOME/.config/google-chrome/${CHROME_PROFILE}/History"
TABS_COUNT=0
FILES_COUNT=0

if [ -f "$HISTORY_DB" ]; then
    # Copy to avoid lock issues
    cp "$HISTORY_DB" "$DUMP_DIR/History"

    # Extract recent URLs (last 2 hours)
    TABS_COUNT=$(sqlite3 "$DUMP_DIR/History" \
        "SELECT COUNT(*) FROM urls WHERE last_visit_time > (strftime('%s','now')-7200)*1000000+11644473600000000;" \
        2>/dev/null || echo "0")

    # Extract recent downloads
    FILES_COUNT=$(sqlite3 "$DUMP_DIR/History" \
        "SELECT COUNT(*) FROM downloads WHERE start_time > (strftime('%s','now')-7200)*1000000+11644473600000000;" \
        2>/dev/null || echo "0")

    # Save tab list as text
    sqlite3 "$DUMP_DIR/History" \
        "SELECT url, title FROM urls WHERE last_visit_time > (strftime('%s','now')-7200)*1000000+11644473600000000 ORDER BY last_visit_time DESC LIMIT 50;" \
        > "$DUMP_DIR/tabs.txt" 2>/dev/null || true

    # Save download list
    sqlite3 "$DUMP_DIR/History" \
        "SELECT target_path FROM downloads WHERE start_time > (strftime('%s','now')-7200)*1000000+11644473600000000;" \
        > "$DUMP_DIR/downloads.txt" 2>/dev/null || true
else
    echo "[dump] Chrome History not found at ${HISTORY_DB}"
fi

# ── 2. Clipboard ──
if command -v xclip &>/dev/null; then
    xclip -selection clipboard -o > "$DUMP_DIR/clipboard.txt" 2>/dev/null || true
fi

# ── 3. Screenshot ──
if command -v scrot &>/dev/null; then
    scrot "$DUMP_DIR/screenshot.png" 2>/dev/null || true
elif command -v gnome-screenshot &>/dev/null; then
    gnome-screenshot -f "$DUMP_DIR/screenshot.png" 2>/dev/null || true
fi

# ── 4. Downloads folder listing ──
ls -la "$HOME/Downloads/" > "$DUMP_DIR/downloads_dir.txt" 2>/dev/null || true

# ── 5. Metadata JSON ──
cat > "$META_FILE" <<EOJSON
{
    "session_id": ${SESSION_ID},
    "chrome_profile": "${CHROME_PROFILE}",
    "tabs_count": ${TABS_COUNT},
    "files_count": ${FILES_COUNT},
    "collected_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "hostname": "$(hostname)"
}
EOJSON

cp "$META_FILE" "$DUMP_DIR/metadata.json"

# ── 6. Archive ──
tar -czf "$ARCHIVE" -C /tmp "session_${SESSION_ID}_dump"

echo "[dump] Archive created: ${ARCHIVE}"
echo "[dump] Tabs: ${TABS_COUNT}, Files: ${FILES_COUNT}"

# Clean up temp dir
rm -rf "$DUMP_DIR"

echo "[dump] Done."
