#!/usr/bin/env bash

if [ -f ".env" ]; then
    source .env
fi

ACTION=$1;shift
BRANCH="master"
ENV=""
LOCAL=false

while getopts b:,l flag; do
  case $flag in
    b)
      BRANCH=$OPTARG
      ;;
    l)
      LOCAL="true"
      ;;
    ?)
      ACTION="help"
      ;;
  esac
done

help() {
    echo "Deploys the application onto a DigitalOcean droplet"
    echo ""
    echo "Usage:"
    echo "  deploy.sh [COMMAND] [-l]"
    echo ""
    echo "Options:"
    echo "  -b                 Set the branch to checkout"
    echo "  -l                 Runs the local docker-compose file (uses ngrok)"
    echo ""
    echo "Command:"
    echo "  up                 Creates a DigitalOcean droplet"
    echo "  provision          Runs docker-compose on the droplet"
    echo "  status             Shows the status of the droplet and ipv4 address"
    echo "  down               Destroys the droplet"
    echo "  ssh                Connects to the droplet via SSH"
    exit 0
}

deployAction() {
    createKey
    SSH_PUB_KEY_ID=$(getKeyID)
    if [ "$SSH_PUB_KEY_ID" == "null" ]; then
        exit 1
    fi
    if [ "$(status)" == "down" ]; then
        curl -s -X POST -H "Content-Type: application/json" \
        -H "Authorization: Bearer $DIGITALOCEAN_TOKEN" \
        -d '{"name":"ccnext","region":"nyc3","size":"1gb","image":"docker","ssh_keys":["'"$SSH_PUB_KEY_ID"'"],"tags":["ccnext"]}' \
        "https://api.digitalocean.com/v2/droplets" | jq
    fi

    n=0
    until [ $n -ge 30 -o "$(status)" == "active" ]; do
        echo "current status: $(status)"
        n=$[$n+1]
        sleep 1
    done

    if [ "$(status)" != "active" ]; then
      echo "failed to start"
    else
      echo "provisioning"
      provisionAction
      statusAction
    fi
}

provisionAction() {
read -r -d "" PROVISION <<EOF
sudo curl -o /usr/local/bin/docker-compose -L "https://github.com/docker/compose/releases/download/1.15.0/docker-compose-\$(uname -s)-\$(uname -m)"
sudo chmod +x /usr/local/bin/docker-compose
docker-compose -v
mkdir -p /app
rm -rf /app/ccnext
echo 'export PUBLIC_URL="http://$(ipv4)"' >> /app/.env
echo 'export TWILIO_ACCOUNT_SID="${TWILIO_ACCOUNT_SID}"' >> /app/.env
echo 'export TWILIO_AUTH_TOKEN="${TWILIO_AUTH_TOKEN}"' >> /app/.env
echo 'export TWILIO_NUMBER_SID="${TWILIO_NUMBER_SID}"' >> /app/.env
echo 'export AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID}"' >> /app/.env
echo 'export AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY}"' >> /app/.env
echo 'DEMO_AGENT_PHONE_NUMBER="${DEMO_AGENT_PHONE_NUMBER}"' >> /app/.env
if [ ! -d "/app/ccnext/.git" ]; then
    git clone https://github.com/github1/ccnext.git /app/ccnext
fi
cd /app/ccnext
if [ -d "/app/ccnext" ]; then
    git checkout "${BRANCH}"
    git pull
fi
cp /app/.env /app/ccnext/.env
source /app/ccnext/.env
docker-compose -f docker-compose.yml up
EOF
    IP_ADDR=$(ipv4)
    until nc -zvw 1 ${IP_ADDR} 22; do
      sleep 2
    done
    ssh root@${IP_ADDR} -oStrictHostKeyChecking=no -i /tmp/ccnext_ssh -t "${PROVISION}"
}

statusAction() {
    echo "status: $(status)"
    IPV4=$(ipv4)
    if [ -n "$IPV4" ]; then
        echo "ip: $(ipv4)"
    fi
}

destroyAction() {
    destroy
    n=0
    until [ $n -ge 30 -o "$(status)" == "down" ]; do
        echo "current status: $(status)"
        n=$[$n+1]
        sleep 1
    done

    if [ "$(status)" != "down" ]; then
      echo "failed to stop"
    else
      statusAction
    fi
}

sshAction() {
    if [ "$(status)" == "active" ]; then
        ssh root@$(ipv4) -oStrictHostKeyChecking=no -i /tmp/ccnext_ssh
    else
        statusAction
    fi
}

getKeys() {
    curl -s -X GET -H "Content-Type: application/json" \
    -H "Authorization: Bearer $DIGITALOCEAN_TOKEN" \
    "https://api.digitalocean.com/v2/account/keys"
}

getKeyID() {
    echo $(getKeys | jq -c '[ .ssh_keys[] | select( .name | contains("ccnext-ssh")).id ][0]' -r)
}

destroyKey() {
    if [ "$(getKeyID)" != "null" ]; then
        curl -s -X DELETE -H "Content-Type: application/json" \
        -H "Authorization: Bearer $DIGITALOCEAN_TOKEN" \
        "https://api.digitalocean.com/v2/account/keys/$(getKeyID)"
    fi
}

createKey() {
    destroyKey
    rm /tmp/ccnext_ssh
    rm /tmp/ccnext_ssh.pub
    ssh-keygen -b 2048 -t rsa -f /tmp/ccnext_ssh -N ""
    SSH_PUB_KEY=$(cat /tmp/ccnext_ssh.pub)
    curl -s -X POST -H "Content-Type: application/json" \
    -H "Authorization: Bearer $DIGITALOCEAN_TOKEN" \
    -d '{"name":"ccnext-ssh","public_key":"'"${SSH_PUB_KEY}"'"}' \
    "https://api.digitalocean.com/v2/account/keys" | jq
}

list() {
    curl -s -X GET -H "Content-Type: application/json" \
    -H "Authorization: Bearer $DIGITALOCEAN_TOKEN" \
    "https://api.digitalocean.com/v2/droplets?tag_name=ccnext"
}

numInstances() {
    echo $(list | jq '.droplets | length')
}

status() {
    if [ "$(numInstances)" = 0 ]; then
        echo "down"
    else
        echo $(list | jq .droplets[0].status -r)
    fi
}

ipv4() {
    if [ "$(status)" != "down" ]; then
        echo $(list | jq .droplets[0].networks.v4[0].ip_address -r)
    fi
}

destroy() {
    if [ "$(status)" != "down" ]; then
        curl -X DELETE -H "Content-Type: application/json" \
        -H "Authorization: Bearer $DIGITALOCEAN_TOKEN" \
        "https://api.digitalocean.com/v2/droplets?tag_name=ccnext"
    fi
}

if [ -z "${ACTION}" -o "${ACTION}" = "help" ]; then
  help
fi

if [ "${LOCAL}" = "true" ]; then

    if [ "${ACTION}" = "up" ]; then
        docker-compose -f docker-compose.local.yml up --remove-orphans
    elif [ "${ACTION}" = "down" ]; then
        docker-compose -f docker-compose.local.yml down
    else
        echo "Command '${ACTION}' supported in local mode"
    fi

else

    if [ "${ACTION}" = "up" ]; then
        deployAction
    elif [ "${ACTION}" = "provision" ]; then
        provisionAction
    elif [ "${ACTION}" = "status" ]; then
        statusAction
    elif [ "${ACTION}" = "down" ]; then
        destroyAction
    elif [ "${ACTION}" = "ssh" ]; then
        sshAction
    fi

fi

exit 0
