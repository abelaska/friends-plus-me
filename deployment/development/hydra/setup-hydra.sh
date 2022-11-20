#!/bin/bash
#
HYDRA_VERSION="0.11.12"
DIR=$(pwd)/$(dirname $0)
HYDRA="docker run --rm -it --net=host --entrypoint hydra -v $DIR/hydra.yml:/hydra.yml:ro oryd/hydra:v$HYDRA_VERSION-alpine --config /hydra.yml  --skip-tls-verify"

$HYDRA clients create \
  --id draft-app \
  --secret secret \
  --name "Draft App" \
  --grant-types "implicit,refresh_token,client_credentials,authorization_code" \
  --response-types "token,id_token,code" \
  --allowed-scopes "admin offline hydra.consent hydra.introspect" \
  --callbacks "http://localhost:3000/login"

$HYDRA policies create \
    --actions introspect \
    --description "Allow draft-app to introspect OAuth2 tokens." \
    --allow \
    --id draft-app-token-policy \
    --resources "rn:hydra:oauth2:tokens" \
    --subjects draft-app

# The following policy allows draft-app to access the required cryptographic keys for validating and signing the consent challenge and response
$HYDRA policies create \
    --actions get,accept,reject \
    --description "Allow draft-app to manage OAuth2 consent requests." \
    --allow \
    --id draft-app-policy \
    --resources "rn:hydra:oauth2:consent:requests:<.*>" \
    --subjects draft-app

# We want to allow everyone (not only our consumer) access to the public key of the OpenID Connect ID Token
$HYDRA policies create \
  --actions get \
  --description "Allow everyone to read the OpenID Connect ID Token public key" \
  --allow \
  --id openid-id_token-policy \
  --resources rn:hydra:keys:hydra.openid.id-token:public \
  --subjects "<.*>"
