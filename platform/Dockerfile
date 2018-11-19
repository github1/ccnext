FROM node:8

WORKDIR /opt/app

ADD . /opt/app
RUN npm install --unsafe-perm
EXPOSE 9999

CMD ["./run.sh"]
