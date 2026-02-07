#!/bin/bash

set -e

# Setup paths
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
EXT_DIR="$SCRIPT_DIR/V3"
DATA_DIR="$SCRIPT_DIR/data"
OUTPUT_FILE="$SCRIPT_DIR/bopomofo-ruby.zip"

# Check for Node.js
if ! command -v node >/dev/null 2>&1; then
    echo "Error: Node.js is required to build the dictionary."
    exit 1
fi

# Ensure data exists. If characters.tsv is missing, try to import from Unihan.
if [ ! -f "$DATA_DIR/characters.tsv" ]; then
    echo "characters.tsv not found. Running import-unihan.js to fetch data..."
    node "$SCRIPT_DIR/scripts/import-unihan.js"
fi

# Build dictionary from TSV files
echo "Building dictionary.js from TSV files..."
node "$SCRIPT_DIR/scripts/build-dictionary.js"

# Lint extension
echo -e "\nLinting extension..."
if command -v bun >/dev/null 2>&1; then
    bunx web-ext lint -s "$EXT_DIR" --warnings-as-errors
else
    npx web-ext lint -s "$EXT_DIR" --warnings-as-errors
fi
echo "Lint passed!"

# Package extension
echo -e "\nPackaging extension..."
rm -f "$OUTPUT_FILE"

cd "$EXT_DIR"
# Zip everything in the V3 directory, excluding system metadata
zip -r "$OUTPUT_FILE" . -x "*.DS_Store" "*__MACOSX*"

echo "Created: $OUTPUT_FILE"
echo ""
echo "To install in Firefox:"
echo "  1. Open about:debugging"
echo "  2. Click 'This Firefox'"
echo "  3. Click 'Load Temporary Add-on'"
echo "  4. Select the zip file or manifest.json from V3/"
