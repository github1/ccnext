#!/usr/bin/env bash

set -e

if [ -f "../.env" ]; then
    source ../.env
fi

if [ -f ".env" ]; then
    source .env
fi

if [ -z "${NGROK_URL}" ]; then
  NGROK_URL="http://127.0.0.1:4040"
fi

if [ -z "${PORT}" ]; then
    if curl -s ${NGROK_URL}/status > /dev/null; then
        PORT=$(curl -s ${NGROK_URL}/status | grep -E "localhost:[0-9]+" -oh | head -n 1 | awk -F':' '{print $2}')
    else
        PORT=9999
    fi
fi

if [ -z "${PUBLIC_URL}" ]; then
    if curl -s ${NGROK_URL}/status > /dev/null; then
        PUBLIC_URL=$(curl -s ${NGROK_URL}/status | grep -E "https\:\/\/[^\.]+.ngrok\.io" -oh)
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
export AWS_ACCESS_KEY_ID
export AWS_SECRET_ACCESS_KEY
export AWS_DEFAULT_REGION
export PORT

echo "Serving from ${PUBLIC_URL}"

if [ -z "${USE_NODEMON}" ]; then
  node_modules/.bin/nodemon --watch dist dist/src/main.js
else
  node dist/src/main.js
fi
