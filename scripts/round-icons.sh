#!/bin/bash

# Script to generate PNG icons from logo
# Usage: ./scripts/round-icons.sh

set -e

SOURCE_ICON="public/icon/logo.png"
OUTPUT_DIR="public/icon"

# Function to create resized PNG icon
create_icon() {
    local size=$1
    local output="${OUTPUT_DIR}/logo-${size}.png"

    echo "Creating ${size}x${size} icon..."

    # Resize PNG to specified size
    # Using -background none to preserve transparency
    magick "${SOURCE_ICON}" \
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

