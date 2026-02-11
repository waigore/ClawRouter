#!/bin/bash
set -e

SERVICE_NAME="clawrouter"
SERVICE_FILE="$HOME/.config/systemd/user/${SERVICE_NAME}.service"

echo "ClawRouter Service Uninstaller"
echo "=============================="
echo ""

# Check if service file exists
if [ ! -f "$SERVICE_FILE" ]; then
    echo "Service file not found: $SERVICE_FILE"
    echo "Nothing to uninstall."
    exit 0
fi

# Stop service if running
echo "-> Stopping service..."
systemctl --user stop "$SERVICE_NAME" 2>/dev/null || true

# Disable service
echo "-> Disabling service..."
systemctl --user disable "$SERVICE_NAME" 2>/dev/null || true

# Remove service file
echo "-> Removing service file..."
rm -f "$SERVICE_FILE"

# Reload daemon
echo "-> Reloading systemd daemon..."
systemctl --user daemon-reload

echo ""
echo "ClawRouter service uninstalled successfully."
echo ""
echo "Note: Your wallet key at ~/.openclaw/blockrun/wallet.key was NOT removed."
echo "      Delete it manually if you no longer need it."
