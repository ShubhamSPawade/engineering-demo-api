FROM node:24-alpine AS build
WORKDIR /app
COPY package.json ./
COPY src ./src
COPY scripts ./scripts
COPY test ./test
RUN node scripts/check.mjs && node --test && node scripts/build.mjs

FROM node:24-alpine AS runtime
WORKDIR /app
ARG VCS_REF=unknown
LABEL org.opencontainers.image.revision=$VCS_REF
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000 APP_ENV=production APP_COMMIT=$VCS_REF
COPY --from=build --chown=node:node /app/dist/ ./
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + process.env.PORT + '/health').then(r => { if (!r.ok) process.exit(1); }).catch(() => process.exit(1))"
CMD ["node", "src/server.mjs"]
