#!/bin/sh
set -eu

: "${DB_HOST:?Set DB_HOST}"
: "${DB_PORT:?Set DB_PORT}"
: "${DB_NAME:?Set DB_NAME}"
: "${DB_USER:?Set DB_USER}"
: "${DB_PASSWORD:?Set DB_PASSWORD}"

name="inventory-$(date -u +%Y%m%dT%H%M%SZ).sql"
target="/backups/$name"
umask 077
export MYSQL_PWD="$DB_PASSWORD"
trap 'rm -f "$target.partial"' EXIT HUP INT TERM
mysqldump --host="$DB_HOST" --port="$DB_PORT" --user="$DB_USER" \
  --ssl-mode=VERIFY_IDENTITY --ssl-ca=/run/aiven-ca.pem \
  --single-transaction --set-gtid-purged=OFF --no-tablespaces \
  --column-statistics=0 --skip-comments --skip-extended-insert --order-by-primary \
  "$DB_NAME" > "$target.partial"
test -s "$target.partial"
mv "$target.partial" "$target"
cd /backups
sha256sum "$name" > "$name.sha256"
printf 'Backup saved: deploy/backups/%s\n' "$name"
