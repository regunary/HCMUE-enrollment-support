FROM nginx:1.21.1-alpine

RUN apk add --no-cache logrotate

COPY ./default.conf /etc/nginx/conf.d/default.conf
COPY ./nginx-logrotate.conf /etc/logrotate.d/nginx

RUN echo '*/5  *  *  *  * logrotate -fv /etc/logrotate.d/nginx' > /etc/crontabs/root

WORKDIR /usr/share/nginx/html

CMD ["nginx", "-g", "daemon off;"]
