#!/bin/bash
set -e

SERVICE_NAME="clawrouter"
SERVICE_DIR="$HOME/.config/systemd/user"
SERVICE_FILE="$SERVICE_DIR/${SERVICE_NAME}.service"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SOURCE_SERVICE="$SCRIPT_DIR/${SERVICE_NAME}.service"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "ClawRouter Service Installer"
echo "============================"
echo ""

# Verify the service file exists
if [ ! -f "$SOURCE_SERVICE" ]; then
    echo "ERROR: Service file not found: $SOURCE_SERVICE"
    exit 1
fi

# Verify dist/ exists (project must be built)
if [ ! -f "$PROJECT_DIR/dist/proxy.js" ]; then
    echo "ERROR: dist/ not found. Build the project first:"
    echo "  cd $PROJECT_DIR && npm run build"
    exit 1
fi

# Create systemd user directory if needed
echo "-> Creating systemd user directory..."
mkdir -p "$SERVICE_DIR"

# Update WorkingDirectory in service file to match actual project location
echo "-> Installing service file..."
sed "s|WorkingDirectory=.*|WorkingDirectory=${PROJECT_DIR}|" "$SOURCE_SERVICE" > "$SERVICE_FILE"

echo "-> Reloading systemd daemon..."
systemctl --user daemon-reload

echo "-> Enabling service..."
systemctl --user enable "$SERVICE_NAME"

echo ""
echo "ClawRouter service installed successfully!"
echo ""
echo "Commands:"
echo "  Start:    systemctl --user start $SERVICE_NAME"
echo "  Stop:     systemctl --user stop $SERVICE_NAME"
echo "  Restart:  systemctl --user restart $SERVICE_NAME"
echo "  Status:   systemctl --user status $SERVICE_NAME"
echo "  Logs:     journalctl --user -u $SERVICE_NAME -f"
echo ""
echo "OpenAI-compatible endpoint: http://localhost:${BLOCKRUN_PROXY_PORT:-8402}/v1"
echo "Health check:               http://localhost:${BLOCKRUN_PROXY_PORT:-8402}/health"
echo ""
echo "To configure a custom wallet key, edit:"
echo "  $SERVICE_FILE"
echo "Then: systemctl --user daemon-reload && systemctl --user restart $SERVICE_NAME"
