#!/bin/bash

cd "$(dirname "$0")"

PORT=8000

python3 -m http.server "$PORT" &
SERVER_PID=$!

sleep 1

open "http://localhost:$PORT"

echo ""
echo "Spherical Harmonics simulator is running."
echo "Close this Terminal window or press Control-C to stop."
echo ""

trap "kill $SERVER_PID 2>/dev/null" EXIT INT TERM

wait $SERVER_PID