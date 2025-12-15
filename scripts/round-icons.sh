#!/bin/bash

# Script to generate PNG icons from SVG logo
# Usage: ./scripts/round-icons.sh

set -e

SOURCE_ICON="public/icon/logo.svg"
OUTPUT_DIR="public/icon"

# Function to create PNG icon from SVG
create_icon() {
    local size=$1
    local output="${OUTPUT_DIR}/${size}.png"

    echo "Creating ${size}x${size} icon..."

    # Convert SVG to PNG with specified size
    # Using -background none to preserve transparency
    # Using -density for better quality rendering
    magick -background none -density 300 "${SOURCE_ICON}" \
        -resize "${size}x${size}" \
        "${output}"
}

# Create all required icon sizes for browser extension
create_icon 16
create_icon 32
create_icon 48
create_icon 96
create_icon 128

echo "✓ All icons created successfully from ${SOURCE_ICON}!"

