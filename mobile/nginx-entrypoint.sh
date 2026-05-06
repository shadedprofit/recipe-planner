#!/bin/sh
echo ""
echo "  Web frontend →  http://localhost:${WEB_PORT:-8080}"
echo ""
exec nginx -g "daemon off;"
