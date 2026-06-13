#!/usr/bin/env bash
# ============================================
# convert-editorial.sh — LaTeX → HTML via pandoc
# ============================================
# Usage: ./scripts/convert-editorial.sh [slug]
#   If slug is provided, converts only that editorial.
#   If no slug, converts all editorials in editorials-src/.
#
# Workflow:
#   editorials-src/<slug>/main.tex → src/data/editorials/<slug>/content.html
#
# Requirements: pandoc must be installed locally.
# This script is idempotent — safe to re-run.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SRC_DIR="$PROJECT_ROOT/editorials-src"
OUT_DIR="$PROJECT_ROOT/src/data/editorials"

# --- Check pandoc ---
if ! command -v pandoc &>/dev/null; then
  echo "ERROR: pandoc is not installed."
  echo "Install with: sudo apt install pandoc"
  exit 1
fi

echo "pandoc version: $(pandoc --version | head -1)"

# --- Convert function ---
convert_editorial() {
  local slug="$1"
  local src="$SRC_DIR/$slug"
  local dest="$OUT_DIR/$slug"
  local tex_file="$src/main.tex"

  if [[ ! -f "$tex_file" ]]; then
    echo "SKIP: $tex_file not found"
    return 0
  fi

  echo "Converting: $slug"

  # Create output directory (idempotent)
  mkdir -p "$dest"
  mkdir -p "$dest/images"

  # Convert .tex → HTML with KaTeX math
  # --standalone=false: no <html> wrapper, just the body content
  # --katex: wraps math in KaTeX-compatible spans
  # --section-divs: wraps sections in <section> tags
  pandoc "$tex_file" \
    --from latex \
    --to html5 \
    --katex \
    --section-divs \
    --mathml \
    --wrap=none \
    -o "$dest/content.html" 2>&1 || {
      echo "ERROR: pandoc failed for $slug"
      return 1
    }

  # Rewrite image paths in the HTML
  # \includegraphics{images/fig1.png} → pandoc outputs <img src="images/fig1.png">
  # We need it to point to /editorials/<slug>/images/fig1.png for Astro
  # The images will be served from public/ at build time
  if [[ -d "$src/images" ]]; then
    # Copy images (overwrite cleanly)
    cp -f "$src/images/"* "$dest/images/" 2>/dev/null || true

    # Rewrite image src paths in HTML to use the editorial's slug path
    # Astro will serve from src/data/editorials/<slug>/images/
    # In the editorial page, we'll handle the path mapping
    sed -i "s|src=\"images/|src=\"/editorial-assets/$slug/images/|g" "$dest/content.html"
    sed -i "s|src=\"./images/|src=\"/editorial-assets/$slug/images/|g" "$dest/content.html"
  fi

  # Generate meta.json if not present
  if [[ ! -f "$dest/meta.json" ]]; then
    # Try to extract title from LaTeX
    local title
    title=$(grep -oP '\\title\{[^}]*\}' "$tex_file" | head -1 | sed 's/\\title{//;s/}//' || echo "$slug")
    local author
    author=$(grep -oP '\\author\{[^}]*\}' "$tex_file" | head -1 | sed 's/\\author{//;s/}//' || echo "")
    local date_val
    date_val=$(grep -oP '\\date\{[^}]*\}' "$tex_file" | head -1 | sed 's/\\date{//;s/}//' || echo "$(date +%Y-%m-%d)")

    cat > "$dest/meta.json" <<EOF
{
  "title": "$title",
  "author": "$author",
  "date": "$date_val",
  "abstract": "",
  "tags": [],
  "draft": false
}
EOF
    echo "  Generated meta.json (edit to add abstract/tags)"
  fi

  echo "  ✓ Output: $dest/content.html"
}

# --- Copy images to public for serving ---
copy_assets_to_public() {
  local slug="$1"
  local src_images="$OUT_DIR/$slug/images"
  local pub_dir="$PROJECT_ROOT/public/editorial-assets/$slug/images"

  if [[ -d "$src_images" ]] && [[ "$(ls -A "$src_images" 2>/dev/null)" ]]; then
    mkdir -p "$pub_dir"
    cp -f "$src_images/"* "$pub_dir/" 2>/dev/null || true
    echo "  ✓ Assets copied to public/editorial-assets/$slug/images/"
  fi
}

# --- Main ---
if [[ $# -gt 0 ]]; then
  # Convert specific editorial
  convert_editorial "$1"
  copy_assets_to_public "$1"
else
  # Convert all
  if [[ ! -d "$SRC_DIR" ]]; then
    echo "No editorials-src/ directory found. Nothing to convert."
    echo "Create editorials-src/<slug>/main.tex to get started."
    exit 0
  fi

  for dir in "$SRC_DIR"/*/; do
    slug="$(basename "$dir")"
    convert_editorial "$slug"
    copy_assets_to_public "$slug"
  done
fi

echo ""
echo "Done! Commit the changes in src/data/editorials/ and public/editorial-assets/"
