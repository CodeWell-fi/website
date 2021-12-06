#!/bin/bash

set -e
cd frontend/code

yarn install --frozen-lock-file


export SKIP_PREFLIGHT_CHECK=true # In order to avoid CRA to complain about lib version mismatches

# The tests don't need build result (since using TS-Jest), build performs TS compilation so will catch any type errors in files not included in tests
yarn run build

# Run the tests
yarn run test:coverage
