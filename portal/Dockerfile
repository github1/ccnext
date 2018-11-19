FROM node:8

WORKDIR /opt/app

ADD . /opt/app
RUN npm install --unsafe-perm
EXPOSE 8181

ENV NODE_ENV production

CMD ["./run.sh"]
