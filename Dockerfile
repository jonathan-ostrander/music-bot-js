FROM node:16

# Create app directory
WORKDIR /usr/src/app

COPY yarn.lock .

RUN yarn install

COPY . .

CMD [ "node", "index.js" ]
