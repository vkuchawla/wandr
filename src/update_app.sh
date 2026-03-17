#!/bin/bash
# Safe App.jsx updater — validates before replacing
# Usage: ./update_app.sh ~/Downloads/App.jsx

SRC=${1:-~/Downloads/App.jsx}
DEST=~/Desktop/wandr-app/src/App.jsx

echo "Validating $SRC..."

python3 - "$SRC" << 'PYEOF'
import sys, re

path = sys.argv[1]
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

errors = []

ob, cb = content.count('{'), content.count('}')
if ob != cb:
    errors.append(f"Brace imbalance: {ob} open vs {cb} close")

if content.count('`') % 2 != 0:
    errors.append("Odd backtick count")

for i, ch in enumerate(content):
    if ord(ch) == 0xFE0F:
        line = content[:i].count('\n') + 1
        errors.append(f"Emoji variation selector at line {line}")
        break

if 'export default function App' not in content:
    errors.append("Missing export default function App")

if errors:
    print("FAIL: " + " | ".join(errors))
    sys.exit(1)
else:
    print(f"OK: {len(content.splitlines())} lines")
    sys.exit(0)
PYEOF

if [ $? -eq 0 ]; then
    cp "$SRC" "$DEST"
    echo "✅ App.jsx updated successfully"
else
    echo "❌ Validation failed — App.jsx NOT updated"
fi
