#!/usr/bin/env bash
set -e
cd -- "$(dirname -- "${BASH_SOURCE[0]}")/Satzland"
# The system Node may be too old; prefer the locally installed Node 22 if present.
for dir in "$HOME/.local/share/pukeki-node" /tmp/pukeki-node; do
  if [ -x "$dir/bin/node" ]; then export PATH="$dir/bin:$PATH"; break; fi
done
if ! node -e 'const [a,b]=process.versions.node.split(".").map(Number); process.exit(a>22||(a===22&&b>=13)?0:1)' 2>/dev/null; then
  echo "Node >= 22.13 benötigt, gefunden: $(node --version 2>/dev/null || echo keins)." >&2
  echo "Node 22 von https://nodejs.org entpacken und nach ~/.local/share/pukeki-node verlinken." >&2
  exit 1
fi
[ -d node_modules ] || npm ci --no-audit --no-fund
printf 'Kommatrainer – Königreich Satzland: http://127.0.0.1:5176\nBeenden mit Strg+C.\n'
exec npm run dev
