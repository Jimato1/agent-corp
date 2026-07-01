#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# AUTH-D0 fix — Postgres first-boot init: create the `keycloak` role + database.
#
# WHY THIS FILE EXISTS: the official `postgres` image has NO `POSTGRES_MULTIPLE_
# DATABASES` env var (verified against hub.docker.com/_/postgres — the only DB
# vars are POSTGRES_USER / POSTGRES_PASSWORD / POSTGRES_DB). Setting it did
# nothing, so Keycloak's KC_DB_URL=.../keycloak pointed at a database that was
# never created and Keycloak crash-looped on cold boot.
#
# HOW IT RUNS: the postgres entrypoint executes every *.sh / *.sql under
# /docker-entrypoint-initdb.d ONCE, on FIRST init only (empty data dir), in
# alphanumeric order, connected as the superuser POSTGRES_USER. Container env
# vars are visible here. The `auth` database is already created by the image
# (POSTGRES_DB=auth); this script adds ONLY the `keycloak` role + database whose
# credentials must match Keycloak's KC_DB_USERNAME=keycloak / KC_DB_PASSWORD.
#
# NOTE: KEYCLOAK_DB_PASSWORD is interpolated into a SQL string literal below. We
# double any single-quote (SQL literal escaping) so a quote-bearing password can
# neither break first-boot init nor inject SQL. (Rotate to a vaulted secret for the
# Stage-5 Postgres-HA migration.)
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

: "${KEYCLOAK_DB_PASSWORD:?KEYCLOAK_DB_PASSWORD must be set on the postgres service so the keycloak DB role can be created}"

# SQL-literal-escape single quotes ('  ->  '') before interpolation.
esc_pw="${KEYCLOAK_DB_PASSWORD//\'/\'\'}"

echo "[initdb] creating keycloak role + database (owner=keycloak) ..."

# 1) role: create if absent, (re)set the password to match KC_DB_PASSWORD.
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-SQL
	DO \$do\$
	BEGIN
	   IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'keycloak') THEN
	      CREATE ROLE keycloak LOGIN PASSWORD '${esc_pw}';
	   ELSE
	      ALTER ROLE keycloak WITH LOGIN PASSWORD '${esc_pw}';
	   END IF;
	END
	\$do\$;
SQL

# 2) database: CREATE DATABASE cannot run inside a transaction/DO block, so guard
#    it with \gexec (runs the generated statement only when the DB is absent).
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-SQL
	SELECT 'CREATE DATABASE keycloak OWNER keycloak'
	 WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'keycloak')\gexec
SQL

# 3) belt-and-braces grant (owner already has full rights; explicit for clarity).
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-SQL
	GRANT ALL PRIVILEGES ON DATABASE keycloak TO keycloak;
SQL

echo "[initdb] keycloak database ready; auth database was created by the image (POSTGRES_DB=auth)."
