FROM node:16

# Create app directory
WORKDIR /usr/src/app

COPY package.json .
COPY yarn.lock .

RUN yarn install

RUN npm install -g typescript

COPY . .
RUN tsc

CMD [ "node", "target/index.js" ]
