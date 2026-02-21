-- Create one database per service (naming: aioc_hospital_<servicename>_service).
-- Run automatically on first Postgres start (empty volume), or manually once if volume already existed:
--   docker compose exec postgres psql -U postgres -d postgres -f /docker-entrypoint-initdb.d/01-create-databases.sql
CREATE DATABASE aioc_hospital_login_service;
CREATE DATABASE aioc_hospital_management_service;
CREATE DATABASE aioc_hospital_scheduling_service;
CREATE DATABASE aioc_hospital_reports_service;
