#!/usr/bin/env bash
set -e

if [ -d hcmue_be ]; then
  echo "Running backend checks..."
  # customize for your repo:
  # cd hcmue_be && python manage.py test
fi

if [ -d hcmue_fe ]; then
  echo "Running frontend checks..."
  # customize for your repo:
  # cd hcmue_fe && npm run test
fi

echo "Pre-commit hook completed."
