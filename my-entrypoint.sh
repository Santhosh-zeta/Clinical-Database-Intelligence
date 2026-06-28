#!/bin/bash

# Start a background process that waits for PostgreSQL to be ready, then starts the API
(
  echo "[Setup] Waiting for PostgreSQL to become ready on TCP port 5432..."
  # Loop until pg_isready succeeds (suppress output to avoid spam during init)
  until pg_isready -h localhost -U postgres >/dev/null 2>&1; do
    sleep 2
  done
  
  echo "[Setup] PostgreSQL is ready! Starting Node.js API..."
  cd /app/backend
  
  # Export PGHOST for the Node.js backend
  export PGHOST=127.0.0.1
  
  # Run migrations
  echo "[Setup] Running database migrations..."
  npm run migrate
  
  # Start the Node.js API server
  echo "[Setup] Starting Node.js API Server on port 10000..."
  npm start &

  # Wait for API to be ready, then start simulator
  echo "[Setup] Waiting for API to be ready on port 10000 for simulator..."
  until wget -q -O - http://127.0.0.1:10000/health >/dev/null 2>&1; do
    sleep 2
  done
  
  echo "[Setup] Starting Clinical Simulator..."
  cd /app/simulator
  export API_URL=http://127.0.0.1:10000
  while true; do
    npm run simulate
    echo "[Setup] Simulator exited. Restarting in 10 seconds..."
    sleep 10
  done &
) &

# Execute the original TimescaleDB entrypoint in the FOREGROUND
# This ensures it runs as PID 1 and initializes properly
exec docker-entrypoint.sh "$@"
