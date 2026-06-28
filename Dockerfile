FROM timescale/timescaledb:latest-pg16
ENV POSTGRES_PASSWORD="SuperSecretIntelliCareDB123!"
ENV POSTGRES_USER="postgres"
ENV POSTGRES_DB="clinical_db"
