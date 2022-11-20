# https://github.com/docker-library/ghost/blob/master/3/alpine/Dockerfile

FROM node:16-alpine3.15 as builder

ADD . /app

RUN set -eux && npm install -g pnpm && cd /app && pnpm i --shamefully-hoist || exit 0

RUN set -eux && cd /app && \
  pnpm build && pnpm prune --prod && \
  rm -rf pnpm* && \
  cd /app/services/fpm-web-developers && \
  rm -rf Dockerfile scripts *.md cloudbuild.yaml .jshint* .editorconfig .eslint* .gitignore \
    conf/config-development.toml conf/config-test.toml conf/*.pem && \
  chown -R node:node /app

#
FROM gcr.io/fpm-application/node:16-alpine3.15

ENV NODE_ENV production

WORKDIR /app/services/fpm-web-developers
EXPOSE 3000

COPY --from=builder /app /app

CMD ["node", "server.js"]
