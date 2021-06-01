FROM node:14
LABEL seongwon="seongwon@edu.hanbat.ac.kr"

WORKDIR /usr/src/app
COPY ./package*.json ./
RUN npm install
COPY . .

EXPOSE 8080

ENTRYPOINT [ "npm", "start" ]