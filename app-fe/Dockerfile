FROM nginxinc/nginx-unprivileged:1.22-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY index.html /etc/nginx/html/index.html
COPY styles.css /etc/nginx/html/styles.css
COPY script.js /etc/nginx/html/script.js

# USER root

# RUN chown -R nginx:nginx /etc/nginx/html/$NOME_APP &&  chmod -R 775 /etc/nginx/html/$NOME_APP
# RUN mv /etc/nginx/html/$NOME_APP/* /etc/nginx/html/ && rm -rf /etc/nginx/html/$NOME_APP

# USER 101
