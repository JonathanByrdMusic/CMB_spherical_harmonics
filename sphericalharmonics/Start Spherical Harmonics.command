#!/bin/bash

# Start Spherical Harmonics Simulator
# Runs the website locally from the folder containing this launcher.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

if [ ! -f "index.html" ]; then
    osascript -e 'display dialog "Could not find index.html. Put this launcher in the same folder as the spherical-harmonics website files." buttons {"OK"} default button "OK" with icon stop'
    exit 1
fi

# Find Python 3.
if command -v python3 >/dev/null 2>&1; then
    PYTHON_CMD="python3"
elif command -v python >/dev/null 2>&1; then
    PYTHON_CMD="python"
else
    osascript -e 'display dialog "Python 3 was not found on this Mac. The offline simulator needs a small local web server." buttons {"OK"} default button "OK" with icon stop'
    exit 1
fi

# Find an available local port, starting at 8000.
PORT=8000
while lsof -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; do
    PORT=$((PORT + 1))
    if [ "$PORT" -gt 8010 ]; then
        osascript -e 'display dialog "Could not find an available local port between 8000 and 8010." buttons {"OK"} default button "OK" with icon stop'
        exit 1
    fi
done

# Start the server quietly in the background.
"$PYTHON_CMD" -m http.server "$PORT" --bind 127.0.0.1 >/tmp/spherical_harmonics_server.log 2>&1 &
SERVER_PID=$!

# Give the server a moment to start, then open the simulator.
sleep 1
open "http://127.0.0.1:$PORT/"

# Keep this launcher alive so closing its Terminal window stops the server.
echo ""
echo "Spherical Harmonics Simulator is running locally."
echo "URL: http://127.0.0.1:$PORT/"
echo ""
echo "Keep this window open while using the simulator."
echo "Close this window when you are finished."
echo ""

# Shut down the local server when this script exits.
trap 'kill "$SERVER_PID" 2>/dev/null' EXIT INT TERM
wait "$SERVER_PID"
