#!/usr/bin/env bash
export PATH="/Users/yaswanthmutakani/Work/.tools/node/bin:$PATH"

cd "$(dirname "$0")"

echo "🕉️ Starting Temple Seva Booking System..."
echo "Node: $(node -v) | npm: $(npm -v)"
echo ""
echo "Select option:"
echo "1) Start Development Servers (Backend on :4000, Frontend on :3000)"
echo "2) Run Automated Tests"
echo "3) Re-seed Database"
echo "4) Build for Production"
echo ""

if [ "$1" == "test" ]; then
  npm test
elif [ "$1" == "seed" ]; then
  npm run seed
elif [ "$1" == "build" ]; then
  npm run build
else
  # Default: Start both backend and frontend concurrently
  npx concurrently -k -n "backend,frontend" -c "yellow,magenta" \
    "npm run dev:backend" \
    "npm run dev:frontend"
fi

