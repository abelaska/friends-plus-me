FROM alpine:3.6

MAINTAINER Alois Belaska <alois@loysoft.uk>

RUN echo "http://dl-cdn.alpinelinux.org/alpine/edge/community/" >> /etc/apk/repositories && \
  echo "http://dl-cdn.alpinelinux.org/alpine/edge/testing/" >> /etc/apk/repositories && \
  apk add --update openvpn=2.4.3-r0 \
  bash libintl && \
  apk add --virtual temppkg gettext &&  \
  cp /usr/bin/envsubst /usr/local/bin/envsubst && \
  apk del temppkg && \
  rm -rf /tmp/* /var/tmp/* /var/cache/apk/* /var/cache/distfiles/*

# Needed by scripts
ENV OPENVPN /etc/openvpn
ENV OVPN_TEMPLATE $OPENVPN/templates/openvpn.tmpl
ENV OVPN_CONFIG $OPENVPN/openvpn.conf

ENV OVPN_DEFROUTE 0

ENV OVPN_CIPHER "AES-256-CBC"
ENV OVPN_TLS_CIPHER "TLS-ECDHE-RSA-WITH-AES-128-GCM-SHA256:TLS-ECDHE-ECDSA-WITH-AES-128-GCM-SHA256:TLS-ECDHE-RSA-WITH-AES-256-GCM-SHA384:TLS-DHE-RSA-WITH-AES-256-CBC-SHA256"

# Some PKI scripts.
ADD ./bin /usr/local/bin
COPY *.sh /sbin/
RUN chmod a+x /usr/local/bin/* /sbin/*

COPY openvpn.tmpl $OVPN_TEMPLATE

CMD ["/sbin/entrypoint.sh"]