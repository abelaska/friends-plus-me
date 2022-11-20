FROM gcr.io/google-appengine/debian8

RUN apt-get update -y && \
  apt-get install --no-install-recommends -y -q \
  ca-certificates \
  curl && \
  apt-get clean && \
  rm /var/lib/apt/lists/*_*

RUN curl -OLk https://fastdl.mongodb.org/linux/mongodb-linux-x86_64-debian81-3.6.3.tgz && \
  curl -OLk https://fastdl.mongodb.org/linux/mongodb-linux-x86_64-debian81-3.4.13.tgz && \
  tar xzfm mongodb-linux-x86_64-debian81-3.6.3.tgz && \
  tar xzfm mongodb-linux-x86_64-debian81-3.4.13.tgz && \
  mv mongodb-linux-x86_64-debian81-3.6.3/bin/* /usr/local/bin && \
  mv mongodb-linux-x86_64-debian81-3.4.13/bin/mongod /usr/local/bin/mongod-3.4.13

COPY rs0.key /etc/rs0.key
COPY init.sh /usr/bin/init.sh
RUN chmod +x /usr/bin/init.sh

CMD ["/usr/bin/init.sh"]