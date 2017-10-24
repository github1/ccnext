#!/usr/bin/env bash

export PUBLIC_URL="http://${DP_IP_ADDR}"

docker-compose -f /${DP_NAME}/docker-compose.yml rm -f
docker-compose -f /${DP_NAME}/docker-compose.yml build
docker-compose -f /${DP_NAME}/docker-compose.yml up -d