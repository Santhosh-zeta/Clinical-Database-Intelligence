FROM timescale/timescaledb:latest-pg16
ENV POSTGRES_PASSWORD="SuperSecretIntelliCareDB123!"
ENV POSTGRES_USER="postgres"
ENV POSTGRES_DB="clinical_db"
COPY my-entrypoint.sh /my-entrypoint.sh
ENTRYPOINT ["/my-entrypoint.sh"]
CMD ["postgres"]
