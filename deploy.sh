#!/bin/bash

# Check if profile is provided as argument
if [ $# -eq 1 ]; then
  PROFILE=$1
  echo "Deploying using ASK CLI profile $PROFILE (manual override)..."
  ask deploy --profile $PROFILE
  exit 0
fi

# Get current git branch
BRANCH=$(git branch --show-current)

echo "Current branch: $BRANCH"

# Deploy based on branch using ASK CLI project profiles
case $BRANCH in
  "dev")
    echo "Deploying to development using default project profile..."
    ask deploy --profile default
    ;;
  "master"|"main")
    echo "Deploying to live using live project profile..."
    ask deploy --profile live
    ;;
  *)
    echo "Unknown branch '$BRANCH'. Please specify ASK CLI profile manually:"
    echo "  ./deploy.sh default  # for development"
    echo "  ./deploy.sh live     # for production"
    echo "  ask deploy --profile default  # for development"
    echo "  ask deploy --profile live     # for production"
    exit 1
    ;;
esac