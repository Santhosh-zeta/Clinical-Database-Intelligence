FROM timescale/timescaledb:latest-pg16

# Install Node.js and npm
RUN apk add --no-cache nodejs npm

# Set up PostgreSQL env vars
ENV POSTGRES_PASSWORD="SuperSecretIntelliCareDB123!"
ENV POSTGRES_USER="postgres"
ENV POSTGRES_DB="clinical_db"

# Set up Node.js env vars for the backend
ENV NODE_ENV=production
ENV PGPORT=5432
ENV PGDATABASE=clinical_db
ENV PGUSER=postgres
ENV PGPASSWORD="SuperSecretIntelliCareDB123!"
ENV PORT=10000

# Copy backend code
COPY backend /app/backend

# Install backend dependencies
WORKDIR /app/backend
RUN npm install

# Copy simulator code
COPY simulator /app/simulator

# Install simulator dependencies
WORKDIR /app/simulator
RUN npm install

# Copy entrypoint script
COPY my-entrypoint.sh /my-entrypoint.sh
RUN chmod +x /my-entrypoint.sh

WORKDIR /

ENTRYPOINT ["/my-entrypoint.sh"]
CMD ["postgres"]
