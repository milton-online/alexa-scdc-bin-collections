#!/bin/bash

# Check if profile is provided as argument
if [ $# -eq 1 ]; then
  PROFILE=$1
  echo "Deploying Lambda code using ASK CLI profile $PROFILE (manual override)..."
  ask deploy --target lambda --profile $PROFILE
  exit 0
fi

# Deploy only Lambda code based on current branch
BRANCH=$(git branch --show-current)

echo "Deploying Lambda code from branch: $BRANCH"

case $BRANCH in
  "dev")
    echo "Deploying Lambda to development using default project profile..."
    ask deploy --target lambda --profile default
    ;;
  "master"|"main")
    echo "Deploying Lambda to live using live project profile..."
    ask deploy --target lambda --profile live
    ;;
  *)
    echo "Unknown branch '$BRANCH'. Please specify ASK CLI profile manually:"
    echo "  ./deploy-lambda.sh default  # for development"
    echo "  ./deploy-lambda.sh live     # for production"
    exit 1
    ;;
esac