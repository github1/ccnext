# ccnext
[![Build Status][travis-badge]][travis-ci]

## Getting started

##### Install
```shell
cd platform
npm install
```

##### Configure your `.env`
Create a file named `.env` in the project root dir. Inside it `export` the following environment variables: 

- `TWILIO_ACCOUNT_SID` - your twilio account SID
- `TWILIO_AUTH_TOKEN` - your twilio auth token
- `TWILIO_NUMBER_SID` - the SID for your twilio phone number
- `AWS_ACCESS_KEY_ID` - your AWS access key ID
- `AWS_SECRET_ACCESS_KEY` - your AWS secret access key
- `AWS_DEFAULT_REGION` - the default AWS region to use

##### Run
In order to function properly, the service must be hosted on a publicly routable endpoint. You optionally may use [ngrok] to expose the service from your machine by way of a secure tunnel.

##### Using ngrok
Start ngrok tunneling http traffic on a port of your choice:
```shell
ngrok http <port>
```
... then start the service in a separate terminal.
```shell
./run.sh
```

##### Using a dedicated host
When running the script, a fully qualified url to the script via the `PUBLIC_URL` variable. The `PUBLIC_URL` variable may also be defined in your `.env` file.
```shell
PUBLIC_URL=<url> ./run.sh
```

[travis-badge]: https://travis-ci.org/github1/ccnext.svg?branch=master
[travis-ci]: https://travis-ci.org/github1/ccnext
[ngrok]: https://ngrok.com/