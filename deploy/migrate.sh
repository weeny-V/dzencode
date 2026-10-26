#!/bin/sh
# A deliberate one-shot operation: application schema + initial seed, never the integration database.
set -eu
: "${DB_HOST:?Set DB_HOST}"
: "${DB_PORT:?Set DB_PORT}"
: "${DB_NAME:?Set DB_NAME}"
: "${DB_USER:?Set DB_USER}"
: "${DB_PASSWORD:?Set DB_PASSWORD}"
case "$DB_HOST" in *[!a-zA-Z0-9.-]*|'') echo 'Invalid database hostname' >&2; exit 1;; esac
case "$DB_PORT" in *[!0-9]*|'') echo 'Invalid database port' >&2; exit 1;; esac
case "$DB_NAME" in *[!a-zA-Z0-9_]*|'') echo 'Invalid database name' >&2; exit 1;; esac
test -f /run/aiven-ca.pem
keytool -importcert -noprompt -alias inventory-db -file /run/aiven-ca.pem \
  -keystore /tmp/inventory-ca.p12 -storetype PKCS12 -storepass changeit >/dev/null 2>&1
export LIQUIBASE_COMMAND_USERNAME="$DB_USER"
export LIQUIBASE_COMMAND_PASSWORD="$DB_PASSWORD"
export LIQUIBASE_COMMAND_URL="jdbc:mysql://$DB_HOST:$DB_PORT/$DB_NAME?sslMode=VERIFY_IDENTITY&trustCertificateKeyStoreUrl=file:/tmp/inventory-ca.p12&trustCertificateKeyStoreType=PKCS12&trustCertificateKeyStorePassword=changeit"
exec liquibase --searchPath=/liquibase/changelog --changeLogFile=db.changelog-root.yaml --contexts=seed update
