FROM node:22-alpine as builder
WORKDIR /usr/src/app
COPY . .
RUN npm install
RUN npm run build
CMD [ "npm", "run", "start" ]
