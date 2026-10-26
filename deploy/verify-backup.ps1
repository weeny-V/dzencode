[CmdletBinding()]
param([Parameter(Mandatory = $true)][string]$BackupFile)

$ErrorActionPreference = 'Stop'
$taskBackupDir = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot 'backups'))
$taskBackup = Get-Item -LiteralPath (Join-Path $taskBackupDir $BackupFile)
if ($taskBackup.DirectoryName -ne $taskBackupDir -or $taskBackup.Name -notmatch '^inventory-\d{8}T\d{6}Z\.sql$') {
  throw 'Choose a timestamped inventory SQL export inside deploy/backups'
}
$taskContainer = "dzencode-restore-$PID"
$taskRoundTrip = "restore-roundtrip-$PID.sql"
$taskCreated = $false
try {
  docker run --detach --name $taskContainer --network none --tmpfs /var/lib/mysql --env MYSQL_ROOT_PASSWORD=disposable-restore-only --env MYSQL_DATABASE=inventory_restore --mount "type=bind,source=$taskBackupDir,target=/backups" mysql:8.4 --skip-log-bin
  if ($LASTEXITCODE -ne 0) { throw 'Isolated restore startup failed' }
  $taskCreated = $true
  $taskReady = $false
  for ($taskAttempt = 0; $taskAttempt -lt 90; $taskAttempt++) {
    docker exec --env MYSQL_PWD=disposable-restore-only $taskContainer mysql --protocol=TCP --host=127.0.0.1 --user=root --database=inventory_restore --execute=status 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) { $taskReady = $true; break }
    Start-Sleep -Seconds 1
  }
  if (-not $taskReady) { throw 'Isolated restore not ready' }
  docker exec --env MYSQL_PWD=disposable-restore-only $taskContainer sh -c ('mysql --user=root inventory_restore < /backups/' + $taskBackup.Name)
  if ($LASTEXITCODE -ne 0) { throw 'Isolated import failed' }
  docker exec --env MYSQL_PWD=disposable-restore-only $taskContainer sh -c ('mysqldump --user=root --single-transaction --set-gtid-purged=OFF --no-tablespaces --column-statistics=0 --skip-comments --skip-extended-insert --order-by-primary inventory_restore > /backups/' + $taskRoundTrip)
  if ($LASTEXITCODE -ne 0) { throw 'Restored dump failed' }
  $taskSourceHash = (Get-FileHash -LiteralPath $taskBackup.FullName -Algorithm SHA256).Hash
  $taskRestoreHash = (Get-FileHash -LiteralPath (Join-Path $taskBackupDir $taskRoundTrip) -Algorithm SHA256).Hash
  if ($taskSourceHash -ne $taskRestoreHash) { throw 'Round-trip dump differs' }
  Write-Output 'PASS: isolated offline restore and byte-identical schema/data round-trip dump'
} finally {
  if ($taskCreated) {
    docker rm --force $taskContainer
    if ($LASTEXITCODE -ne 0) { Write-Error "Restore cleanup failed: $taskContainer" }
  }
}
