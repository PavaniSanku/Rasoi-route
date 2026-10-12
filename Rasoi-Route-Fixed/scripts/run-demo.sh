#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")/.."
if [ -z "${JWT_SECRET:-}" ]; then
  mkdir -p data
  if [ ! -f data/demo-jwt.key ]; then
    umask 077
    head -c 48 /dev/urandom | base64 > data/demo-jwt.key
  fi
  JWT_SECRET=$(cat data/demo-jwt.key)
  export JWT_SECRET
fi
exec java -jar release/rasoi-route.jar --spring.profiles.active=demo --server.address=127.0.0.1
