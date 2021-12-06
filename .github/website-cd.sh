#!/bin/bash

set -e
cd frontend/public

npm ci --ignore-scripts
cp ../../infrastructure/website/src/naming.ts src
export WEBSITE_INFRA_CONFIG="$(cat "config/config-${WEBSITE_ENV}.json")"
npm run build
npm run test
npm run deploy
