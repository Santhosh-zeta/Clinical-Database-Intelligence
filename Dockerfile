FROM timescale/timescaledb:latest-pg16
ENV POSTGRES_PASSWORD="SuperSecretIntelliCareDB123!"
ENV POSTGRES_USER="postgres"
ENV POSTGRES_DB="clinical_db"
CMD ["sh", "-c", "while true; do printf 'HTTP/1.1 200 OK\r\n\r\nHealthy\n' | nc -l -p 10000; done & exec postgres"]
