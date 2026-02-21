#!/bin/bash
# Idempotent create of per-service DBs. Use when Postgres volume already existed and init didn't run.
# Run: docker compose exec postgres /docker-entrypoint-initdb.d/02-create-databases-idempotent.sh
set -e
for db in aioc_hospital_login_service aioc_hospital_management_service aioc_hospital_scheduling_service aioc_hospital_reports_service; do
  psql -v ON_ERROR_STOP=0 -U postgres -d postgres -c "CREATE DATABASE $db;" 2>/dev/null || true
done
