#!/usr/bin/env bash

if [ -z "${NGROK_URL}" ]; then
  NGROK_URL="http://127.0.0.1:4040"
fi

if [ -z "${PORT}" ]; then
    PORT=8181
fi

if [ -z "${PUBLIC_URL}" ]; then
    if curl -s ${NGROK_URL}/status > /dev/null; then
        PUBLIC_URL=$(curl -s ${NGROK_URL}/status | grep ":${PORT}" | grep -E "https\:\/\/[^\.]+.ngrok\.io" -oh)
    fi
fi

export PUBLIC_URL

node server.js