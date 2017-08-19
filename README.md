# ccnext
[![Build Status][travis-badge]][travis-ci]

## Getting started

##### Configure your `.env`
Create a file named `.env` in the project root dir. Inside it `export` the following environment variables: 

- `TWILIO_ACCOUNT_SID` — a Twilio account SID
- `TWILIO_AUTH_TOKEN` — a Twilio auth token
- `TWILIO_NUMBER_SID` — a SID for a twilio phone number for inbound/outbound calls/sms
- `AWS_ACCESS_KEY_ID` — an AWS access key ID
- `AWS_SECRET_ACCESS_KEY` — an AWS secret access key
- `AWS_DEFAULT_REGION` — the default AWS region to use
- `DIGITALOCEAN_TOKEN` — a DigitalOcean API token (optional)

##### AWS Permissions

- `AmazonDynamoDBFullAccess`
- `AmazonLexFullAccess`

##### Run
The deployment process requires at minimum docker & docker-compose to be installed on the host machine.
```shell
sh deploy.sh up
```

##### Options
- `-b` — Set the branch to checkout
- `-l` — Runs in local mode (uses [ngrok] to expose a public URL)

##### Commands
- `up` — Creates a DigitalOcean droplet (or runs docker-compose.local.yml in local mode)
- `provision` — Runs docker-compose on the droplet
- `status` — Shows the status of the droplet and ipv4 address
- `down` — Destroys the droplet/docker-compose services
- `ssh` — Connects to the droplet via SSH

[travis-badge]: https://travis-ci.org/github1/ccnext.svg?branch=master
[travis-ci]: https://travis-ci.org/github1/ccnext
[ngrok]: https://ngrok.com/