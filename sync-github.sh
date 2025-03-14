#!/bin/bash

echo "Running GitHub sync script..."
echo "Checking for uncommitted changes..."

# Configure git if not already done
git config --global user.email "replit@example.com" || true
git config --global user.name "Replit Automator" || true

# Check if there are any changes to commit
if [[ -n $(git status -s) ]]; then
  echo "Found changes, committing..."
  git add .
  git commit -m "chore: Daily automated sync $(date +%Y-%m-%d)"
fi

# Push changes to GitHub
echo "Pushing to GitHub..."
git push origin main || echo "Push failed, will retry on next run"

echo "Sync completed at $(date)"
