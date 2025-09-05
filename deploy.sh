#!/bin/bash

set -e  # Exit on any error

# Step 1: Clean up old app
echo "🧹 Removing old backend directory..."
rm -rf /home/ubuntu/PWD_PILOT/Beneficiary_API/beneficiary-backend

# Step 2: Clone latest code
echo "📥 Cloning repo..."
cd /home/ubuntu/PWD_PILOT/Beneficiary_API
#git clone https://github.com/PSMRI/beneficiary-backend -b main
git clone https://github.com/PSMRI/ubi-beneficiary-backend -b main
# Step 3: Copy Dockerfile and .env
echo "📋 Copying Dockerfile and .env..."
cp /home/ubuntu/PWD_PILOT/Beneficiary_API/Dockerfile ./beneficiary-backend/
cp /home/ubuntu/PWD_PILOT/Beneficiary_API/.env ./beneficiary-backend/

# Step 4: Build the image (from correct folder!)
echo "🐳 Building Docker image..."
cd beneficiary-backend
docker build --no-cache -t beneficiary-backend:latest .

# Step 5: Start using Docker Compose
echo "🚀 Starting backend with Docker Compose..."
cd ..
docker compose down
docker compose up -d --force-recreate --build

# Step 6: Check logs
sleep 10
echo "📄 Logs from backend container:"
docker logs beneficiary-backend
