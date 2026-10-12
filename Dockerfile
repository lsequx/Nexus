# syntax=docker/dockerfile:1
FROM node:24-bookworm-slim AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN --mount=type=secret,id=build_ca,mode=0444,required=false \
    if [ -f /run/secrets/build_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/build_ca; fi; \
    npm ci --no-audit --no-fund
COPY frontend/ ./
COPY network/ /app/network/
ENV NEXT_TELEMETRY_DISABLED=1
RUN --mount=type=secret,id=build_ca,mode=0444,required=false \
    if [ -f /run/secrets/build_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/build_ca SSL_CERT_FILE=/run/secrets/build_ca; fi; \
    npm run build

FROM postgres:17-bookworm AS runtime
RUN --mount=type=secret,id=build_ca,mode=0444,required=false \
    rm -f /etc/apt/sources.list.d/pgdg.list \
    && set --; \
    if [ -f /run/secrets/build_ca ]; then \
      sed -i 's|http://|https://|g' /etc/apt/sources.list.d/*; \
      set -- -o Acquire::https::CaInfo=/run/secrets/build_ca; \
    fi; \
    apt-get "$@" update \
    && apt-get "$@" install -y --no-install-recommends python3 python3-venv supervisor ca-certificates \
    && if [ -f /run/secrets/build_ca ]; then \
      cp /run/secrets/build_ca /usr/local/share/ca-certificates/build-ca.crt; update-ca-certificates; \
    fi \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --uid 1000 --create-home nexus
COPY --from=frontend-build /usr/local/bin/node /usr/local/bin/node
RUN python3 -m venv /opt/venv
COPY backend/requirements.txt /tmp/requirements.txt
RUN /opt/venv/bin/pip install --no-cache-dir --cert /etc/ssl/certs/ca-certificates.crt -r /tmp/requirements.txt
COPY --from=frontend-build /app/frontend/.next/standalone/ /app/
COPY --from=frontend-build /app/frontend/.next/static/ /app/frontend/.next/static/
COPY --from=frontend-build /app/frontend/public/ /app/frontend/public/
COPY backend/ /app/backend/
COPY network/ /app/network/
COPY docker/ /app/docker/
# Application users can read code, but cannot replace root's boot scripts.
RUN find /app -type d -exec chmod 755 {} + \
    && find /app -type f -exec chmod 644 {} + \
    && chmod 755 /app/docker/entrypoint.sh \
    && mkdir -p /app/frontend/.next/cache \
    && chown nexus:nexus /app/frontend/.next/cache
ENV NODE_ENV=production \
    PYTHONDONTWRITEBYTECODE=1 \
    NEXT_TELEMETRY_DISABLED=1 \
    PGDATA=/data/postgres \
    NEXUS_DATA_DIR=/data/app \
    NEXUS_INVENTORY_FILE=/data/app/inventory.json \
    HOSTNAME=0.0.0.0 \
    PORT=3000
WORKDIR /app/frontend
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=10s --start-period=60s --retries=3 \
    CMD ["/opt/venv/bin/python", "/app/docker/healthcheck.py"]
ENTRYPOINT ["/app/docker/entrypoint.sh"]
