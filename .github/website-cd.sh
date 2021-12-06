#!/bin/bash

set -e
cd frontend/publish

npm ci --ignore-scripts
cp ../../infrastructure/website/src/naming.ts src
export WEBSITE_INFRA_CONFIG="$(cat "config/config-${WEBSITE_ENV}.json")"
npm run build
npm run test

if [[ -z "$1" ]] || [[ "${GITHUB_EVENT_NAME}" == "$1" ]]; then
  npm run deploy
fi
