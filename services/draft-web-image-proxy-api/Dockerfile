FROM golang:1.10-alpine

RUN apk add --no-cache git

WORKDIR /go/src/main

ADD . .
RUN go get . && CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -a -installsuffix cgo -o draft-web-image-proxy-api

FROM alpine:3.7

COPY --from=0 /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=0 /go/src/main/draft-web-image-proxy-api /usr/bin/draft-web-image-proxy-api

ENTRYPOINT ["draft-web-image-proxy-api"]