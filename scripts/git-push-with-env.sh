#!/bin/bash
# Load .env and push to GitHub

set -e

# Try to find .env file
if [ -f "/a0/docker/run/.env" ]; then
    echo "Loading .env from /a0/docker/run/.env"
    source /a0/docker/run/.env
elif [ -f "docker/run/.env" ]; then
    echo "Loading .env from docker/run/.env"
    source docker/run/.env
elif [ -f ".env" ]; then
    echo "Loading .env from .env"
    source .env
else
    echo "❌ No .env file found!"
    echo "Please create .env with: GITHUB_TOKEN=ghp_..."
    exit 1
fi

# Check if GITHUB_TOKEN is set
if [ -z "$GITHUB_TOKEN" ]; then
    echo "❌ GITHUB_TOKEN not found in .env file!"
    echo "Please add: GITHUB_TOKEN=ghp_..."
    exit 1
fi

echo "✅ GITHUB_TOKEN loaded (starts with: ${GITHUB_TOKEN:0:10}...)"

# Configure git remote with token
echo "Configuring git remote..."
git remote set-url origin https://$GITHUB_TOKEN@github.com/DYAI2025/MVP_onboarding-agents.git

# Push branch
echo "Pushing branch $1..."
git push -u origin "$1"

echo "✅ Push successful!"
