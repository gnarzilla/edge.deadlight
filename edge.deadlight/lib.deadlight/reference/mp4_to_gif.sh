#!/bin/bash

# Usage: ./mp4_to_gif.sh input.mp4 output.gif [width] [fps]
INPUT="$1"
OUTPUT="$2"
WIDTH="${3:-480}"
FPS="${4:-10}"

PALETTE="palette.png"

# Generate palette
ffmpeg -y -i "$INPUT" -vf "fps=$FPS,scale=$WIDTH:-1:flags=lanczos,palettegen" -frames:v 1 "$PALETTE"

# Create GIF using palette
ffmpeg -y -i "$INPUT" -i "$PALETTE" \
  -filter_complex "[0:v]fps=$FPS,scale=$WIDTH:-1:flags=lanczos[x];[x][1:v]paletteuse" \
  "$OUTPUT"
  
# Cleanup
rm "$PALETTE"
