#!/bin/sh
set -eu

# Bind-mounted data dirs (Unraid/Docker) are often created root-owned,
# which hides the image's ownership of /app/data. Fix it as root, then
# drop privileges so the server never runs as root.
DATA_DIR="${FAMILYOS_DATA_DIR:-/app/data}"

if [ "$(id -u)" = "0" ]; then
  mkdir -p "$DATA_DIR"
  chown -R nextjs:nodejs "$DATA_DIR" || true
  exec su-exec nextjs "$@"
fi

exec "$@"
