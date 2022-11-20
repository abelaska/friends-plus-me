## Build

nvm use
pnpm i
pnpm build

### Yarn 2

nvm use
#yarn set version berry
#yarn set version from sources --branch 2262
yarn set version latest
yarn config set nodeLinker "node-modules"
yarn plugin import workspace-tools
yarn plugin import exec
yarn
yarn build
yarn workspace @fpm/web-api run start
yarn workspace @fpm/web-app run deploy
yarn workspace @fpm/web-landing-page run deploy
yarn workspace @fpm/web-developers run deploy

### Yarn Bugs

- https://github.com/yarnpkg/berry/issues/2232

## Build Old

nvm use 11.15.0
npm set registry https://npm.friendsplus.me
npm i
npm run bootstrap
npm run lerna:publish

## npm registry

yarn config set registry https://npm.friendsplus.me
npm config set always-auth true
npm set registry https://npm.friendsplus.me

## lerna upgrade

npm install --global lerna@^2.0.0-beta
lerna init

trust self-signed certificate http://blog.getpostman.com/2014/01/28/using-self-signed-certificates-with-postman/

https://lernajs.io/
https://github.com/lerna/lerna
https://www.npmjs.com/package/lerna
https://kikobeats.com/monorepo/
https://github.com/este/este
https://facebook.github.io/jest/docs/api.html

## redis dev - monitor

redis-cli -h pub-redis-16307.us-central1-1-1.gce.garantiadata.com -p 16307 -a XXX monitor

## extract graphql schema

NODE_TLS_REJECT_UNAUTHORIZED=0 fetch-graphql-schema https://localhost:3000/graphql?access_token=XXX -r -o schema.graphql

fetch-graphql-schema https://api.github.com/graphql -r -o github.graphql

## yarn upgrade

yarn config set registry https://registry.npmjs.org/

## brew flow

yarn global add flow-bin@0.38.0

/Users/abelaska/.config/yarn/global/node_modules/.bin/flow

## eslint fixes

- https://github.com/eslint/eslint/issues/2156
