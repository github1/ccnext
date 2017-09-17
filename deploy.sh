#!/usr/bin/env bash

if [ ! -f .work/dropler/deploy.sh ]; then
  mkdir -p .work
  git clone https://github.com/github1/dropler.git .work/dropler
fi

export ROOT_DOMAIN=open-cc.org

. .work/dropler/deploy.sh "${@:1}" \
  -e AWS_ACCESS_KEY_ID \
  -e AWS_SECRET_ACCESS_KEY \
  -e AWS_DEFAULT_REGION \
  -e TWILIO_NUMBER_SID \
  -e TWILIO_ACCOUNT_SID \
  -e TWILIO_AUTH_TOKEN \
  -e DEMO_AGENT_PHONE_NUMBER