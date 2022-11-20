FROM launcher.gcr.io/google/debian8:latest

WORKDIR /etc/openvpn
EXPOSE 443/tcp

RUN curl -L https://install.pivpn.io | bash

COPY *.sh /sbin/

CMD ["/sbin/entrypoint.sh"]