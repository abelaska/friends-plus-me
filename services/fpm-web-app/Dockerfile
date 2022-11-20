# https://github.com/docker-library/ghost/blob/master/3/alpine/Dockerfile

FROM node:16-alpine3.15 as builder

ADD . /app

RUN set -eux && \
  apk add --no-cache bash git && \
  npm install -g pnpm && \
  cd /app && \
  pnpm i --shamefully-hoist || exit 0

RUN set -eux && \
  cd /app && \
  pnpm build && pnpm prune --prod && \
  rm -rf pnpm* && \
  cd /app/services/fpm-web-app && \
  rm -rf public view && mv dist/* . && \
  rm -rf Dockerfile .tmp dist specs scripts *.js *.md bower.json cloudbuild.yaml .gitignore .jshint* .bowerrc .editorconfig .eslint* \
    conf/config-development.toml conf/config-test.toml conf/*.pem && \
  chown -R node:node /app

#
FROM gcr.io/fpm-application/node:16-alpine3.15

ENV NODE_ENV production

WORKDIR /app/services/fpm-web-app
EXPOSE 8080
EXPOSE 10000

COPY --from=builder /app /app

CMD ["node", "src/app.js"]
