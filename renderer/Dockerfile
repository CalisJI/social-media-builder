FROM node:24.4.1-alpine3.22
RUN apk add --no-cache ffmpeg font-dejavu && addgroup -S renderer && adduser -S renderer -G renderer
WORKDIR /app
COPY package.json ./
COPY src ./src
COPY test ./test
RUN mkdir -p /data/renders && chown -R renderer:renderer /data
ENV NODE_ENV=production RENDERER_PORT=3100 RENDER_OUTPUT_DIR=/data/renders RENDER_TIMEOUT_MS=120000
USER renderer
EXPOSE 3100
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 CMD wget -qO- http://127.0.0.1:3100/healthz >/dev/null || exit 1
CMD ["node", "src/server.mjs"]
