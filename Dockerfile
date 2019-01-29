# using latest node, v11.x
FROM node:latest

# tendermint version (duh)
ENV TENDERMINT_VERSION=0.29.0

# set homedir
WORKDIR /usr/src/paradigmcore

# copy source
COPY package.json ./
COPY yarn.lock ./
COPY docker.env .env
COPY . .

# install deps
RUN yarn global add node-gyp scrypt typescript
RUN yarn
RUN yarn build

# update tendermint binary for correct architecture
RUN node ./lib/tendermint/bin/download.js $TENDERMINT_VERSION

# allow API traffic
EXPOSE 4242
EXPOSE 4243

# normal start command
CMD ["yarn", "start"]