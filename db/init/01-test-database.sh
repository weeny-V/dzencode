#!/bin/sh
# Runs once, when the MySQL data volume is created (the official image sources *.sh files from this folder).
# Creates `<database>_test` and lets the application user use it: the same names that Liquibase and the
# integration tests derive from DB_NAME / DB_USER, so custom values in .env keep working.
# The test database is filled by Liquibase (schema only).
set -eu

mysql -uroot -p"${MYSQL_ROOT_PASSWORD}" <<EOSQL
CREATE DATABASE IF NOT EXISTS \`${MYSQL_DATABASE}_test\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
GRANT ALL PRIVILEGES ON \`${MYSQL_DATABASE}_test\`.* TO '${MYSQL_USER}'@'%';
EOSQL
