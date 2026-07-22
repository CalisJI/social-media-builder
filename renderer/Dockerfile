FROM node:24.4.1-alpine3.22
ARG NOTO_VERSION=2.014
ARG NOTO_COMMIT=ffebf8c1ee449e544955a7e813c54f9b73848eac
RUN apk add --no-cache ffmpeg curl fontconfig && mkdir -p /usr/share/fonts/noto \
 && for weight in Regular Medium Bold ExtraBold; do curl -fsSLo "/usr/share/fonts/noto/NotoSans-${weight}.ttf" "https://raw.githubusercontent.com/notofonts/noto-fonts/${NOTO_COMMIT}/hinted/ttf/NotoSans/NotoSans-${weight}.ttf"; done \
 && printf '%s  %s\n' \
  'b85c38ecea8a7cfb39c24e395a4007474fa5a4fc864f6ee33309eb4948d232d5' '/usr/share/fonts/noto/NotoSans-Regular.ttf' \
  '7bbe267354704c6ad18bde24b1dbc756c8e4380ca1c3f3c25c45ec5c4471510b' '/usr/share/fonts/noto/NotoSans-Medium.ttf' \
  'c976e4b1b99edc88775377fcc21692ca4bfa46b6d6ca6522bfda505b28ff9d6a' '/usr/share/fonts/noto/NotoSans-Bold.ttf' \
  '1cfa3aa25ee505ee66cbf12e29b13b4b8dd0f8ca9e89d08e7ca36f3788d80a57' '/usr/share/fonts/noto/NotoSans-ExtraBold.ttf' | sha256sum -c - \
 && fc-cache -f && fc-match "Noto Sans" | grep -q NotoSans \
 && addgroup -S renderer && adduser -S renderer -G renderer
WORKDIR /app
COPY renderer/package.json ./
COPY renderer/src ./src
COPY renderer/test ./test
COPY templates ./templates
RUN mkdir -p /data/renders && chown -R renderer:renderer /data
ENV NODE_ENV=production RENDERER_PORT=3100 RENDER_OUTPUT_DIR=/data/renders RENDER_TIMEOUT_MS=120000 RENDER_TEMPLATES_DIR=/app/templates
ENV NOTO_SANS_VERSION=${NOTO_VERSION} NOTO_SANS_COMMIT=${NOTO_COMMIT}
USER renderer
EXPOSE 3100
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 CMD wget -qO- http://127.0.0.1:3100/healthz >/dev/null || exit 1
CMD ["node", "src/server.mjs"]
