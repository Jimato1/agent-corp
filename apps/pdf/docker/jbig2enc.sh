#!/bin/sh
# Build jbig2enc from source (not in Debian apt). Yields /usr/local/bin/jbig2,
# used by ocrmypdf for lossless mono-scan compression. STRUCTURE §3 stage B.
set -eu

JBIG2ENC_REF="${JBIG2ENC_REF:-0.29}"

cd /tmp
git clone --depth 1 --branch "$JBIG2ENC_REF" https://github.com/agl/jbig2enc.git
cd jbig2enc
./autogen.sh
./configure
make
make install
ldconfig || true

# Sanity check.
jbig2 --version || true
