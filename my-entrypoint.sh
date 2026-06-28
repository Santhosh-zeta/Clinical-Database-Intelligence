#!/bin/bash
# Run a dummy HTTP server on port 10000 to satisfy Render's HTTP health check
sh -c "while true; do printf 'HTTP/1.1 200 OK\r\n\r\nHealthy\n' | nc -l -p 10000; done" &

# Execute the original TimescaleDB entrypoint with the original arguments
exec docker-entrypoint.sh "$@"
