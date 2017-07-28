#!/usr/bin/env bash

set -e

if [ -f "../.env" ]; then
    source ../.env
fi

if [ -f ".env" ]; then
    source .env
fi

if [ -z "${PORT}" ]; then
    if curl -s http://127.0.0.1:4040/status > /dev/null; then
        PORT=$(curl -s http://127.0.0.1:4040/status | grep -E "localhost:[0-9]+" -oh | head -n 1 | awk -F':' '{print $2}')
    else
        PORT=9999
    fi
fi

if [ -z "${PUBLIC_URL}" ]; then
    if curl -s http://127.0.0.1:4040/status > /dev/null; then
        PUBLIC_URL=$(curl -s http://127.0.0.1:4040/status | grep -E "https\:\/\/[^\.]+.ngrok\.io" -oh)
    else
        PUBLIC_URL="http://localhost:${PORT}"
    fi
fi

if [ -z "${TWILIO_NUMBER_SID}" ]; then
    TWILIO_NUMBER_SID=$1
    if [ -z "${TWILIO_NUMBER_SID}" ]; then
        echo "missing required TWILIO_NUMBER_SID"
        exit 1
    fi
fi

export PUBLIC_URL
export TWILIO_ACCOUNT_SID
export TWILIO_AUTH_TOKEN
export TWILIO_NUMBER_SID
export PORT

node_modules/.bin/nodemon --watch dist dist/src/main.js