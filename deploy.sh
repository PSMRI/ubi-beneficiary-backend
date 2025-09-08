#!/bin/bash
set -e

# -------------------------------
# Deployment Script for Backend
# -------------------------------

# Required environment variables (set via secrets / workflow)
: "${BASE_DIR:?Need to set BASE_DIR}"
: "${BRANCH:?Need to set BRANCH}"
: "${SERVICE_NAME:?Need to set SERVICE_NAME}"
: "${TAG:=latest}"  # Default to latest if not provided

REPO_URL="https://github.com/PSMRI/ubi-beneficiary-backend"

# ----- Clean up old code -----
echo "Cleaning up existing $SERVICE_NAME directory..."
rm -rf "$BASE_DIR/$SERVICE_NAME"

# ----- Ensure base directory exists -----
mkdir -p "$BASE_DIR"
cd "$BASE_DIR" || exit 1

# ----- Clone repo -----
echo "Cloning repository from $REPO_URL (branch: $BRANCH)..."
git clone "$REPO_URL" -b "$BRANCH" "$SERVICE_NAME"
cd "$BASE_DIR/$SERVICE_NAME" || exit 1

# ----- Copy config files -----
echo "Copying configuration files..."
rm -f Dockerfile
cp -r "$BASE_DIR/.env" .
cp -r "$BASE_DIR/Dockerfile" .

# ----- Show recent commits -----
git log -n 3 --oneline

# ----- Build Docker image with tag -----
echo "Building Docker image for $SERVICE_NAME with tag $TAG..."
docker build -t "$SERVICE_NAME:$TAG" .

# ----- Stop old container -----
echo "Stopping old container if running..."
docker rm -f "$SERVICE_NAME" 2>/dev/null || true

# ----- Restart service -----
cd "$BASE_DIR" || exit 1
echo "Restarting service with docker-compose..."
docker-compose up -d --force-recreate --no-deps "$SERVICE_NAME"

# ----- Wait and show logs -----
echo "Waiting for container to initialize..."
sleep 15
echo "Logs from $SERVICE_NAME ($TAG):"
docker logs "$SERVICE_NAME"
