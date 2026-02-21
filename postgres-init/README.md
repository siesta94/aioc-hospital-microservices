# Postgres init

The script `01-create-databases.sql` creates one database per service. It runs automatically only when Postgres starts with an **empty** data directory.

If you already had a Postgres volume (e.g. from before per-service DBs), the init does not run. Create the DBs manually once:

```bash
docker compose exec postgres psql -U postgres -d postgres -f /docker-entrypoint-initdb.d/01-create-databases.sql
```

Then restart the app services:

```bash
docker compose up -d
```

Alternatively, start from a clean volume so init runs automatically:

```bash
docker compose down -v
docker compose up --build
```

(Warning: `-v` removes the Postgres volume and all data.)
