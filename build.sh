#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
EXT_DIR="$SCRIPT_DIR/V3"
OUTPUT_FILE="$SCRIPT_DIR/bopomofo-ruby.zip"

echo "Building dictionary from TSV files..."
node "$SCRIPT_DIR/scripts/build-dictionary.js"

echo ""
echo "Linting extension..."
bunx web-ext lint -s "$EXT_DIR" --warnings-as-errors
echo "Lint passed!"

rm -f "$OUTPUT_FILE"

cd "$EXT_DIR"
zip -r "$OUTPUT_FILE" \
    manifest.json \
    dictionary.js \
    segmenter.js \
    content.js \
    popup.html \
    popup.js \
    icons/

echo "Created: $OUTPUT_FILE"
echo ""
echo "To install in Firefox:"
echo "  1. Open about:debugging"
echo "  2. Click 'This Firefox'"
echo "  3. Click 'Load Temporary Add-on'"
echo "  4. Select the zip file or manifest.json from V3/"
