FROM nginx:stable-alpine3.24

# Run as the unprivileged nginx user: the pid file moves to /tmp, the cache and
# html directories become writable by it, and nginx listens on 8080.
RUN sed -i -e 's,^pid .*,pid /tmp/nginx.pid;,' -e '/^user /d' /etc/nginx/nginx.conf \
    && chown -R nginx:nginx /var/cache/nginx /usr/share/nginx/html

COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --chown=nginx:nginx ./dist /usr/share/nginx/html

USER nginx
EXPOSE 8080
