FROM node:latest

WORKDIR /opt/app

ADD . /opt/app
RUN npm install
EXPOSE 9999

CMD ["node", "dist/src/main.js"]
