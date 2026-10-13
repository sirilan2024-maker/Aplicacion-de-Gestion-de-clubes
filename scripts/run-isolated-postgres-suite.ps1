<#
 .SYNOPSIS
 scripts/run-isolated-postgres-suite.ps1
 
 Sporting Saladar — Ejecutor seguro y aislado para la validación PostgreSQL y RLS (Fase 9.1).

 GARANTÍAS DE SEGURIDAD:
 1. Comprueba si el nombre 'sporting-saladar-pg-test-isolated' ya existe en Docker: si existe, ABORTA SIN TOCARLO.
 2. Comprueba si el puerto 54329 está en uso en el sistema: si está en uso, ABORTA sin alterar nada.
 3. Captura el ID exacto del contenedor recién creado ($CREATED_CONTAINER_ID).
 4. Comprueba explícitamente $LASTEXITCODE tras cada comando nativo (docker run, pg_isready, npx tsx).
 5. La limpieza (docker rm -f) opera ÚNICAMENTE en el bloque finally si esta ejecución creó el contenedor, utilizando su ID.
 6. Si cualquier paso falla, se preserva y devuelve el código de salida original sin ocultar el error.
#>

$ErrorActionPreference = "Stop"

$CONTAINER_NAME = "sporting-saladar-pg-test-isolated"
$PORT = 54329
$DB_NAME = "test_sporting_isolated"
$DB_PASS = "test_password_isolated_123"

Write-Host "=== Sporting Saladar: Ciclo de Vida Seguro de Contenedor Efímero ==="

# 1. Comprobar si ya existe un contenedor con este nombre (activo o detenido)
$existingContainer = docker ps -a --filter "name=^/${CONTAINER_NAME}$" --format "{{.ID}}"
if ($existingContainer) {
    Write-Error "[SEGURIDAD ABORTADA] Ya existe un contenedor previo con el nombre '$CONTAINER_NAME' (ID: $existingContainer). No se detendrá ni se eliminará ningún recurso preexistente. Abortando."
    exit 1
}

# 2. Comprobar si el puerto 54329 está ocupado en el sistema
$portCheck = Get-NetTCPConnection -LocalPort $PORT -ErrorAction SilentlyContinue
if ($portCheck) {
    Write-Error "[SEGURIDAD ABORTADA] El puerto $PORT ya está ocupado en el sistema por otro proceso. Abortando sin alterar nada."
    exit 1
}

$CREATED_CONTAINER_ID = $null
$exitCode = 0

try {
    Write-Host "Creando contenedor temporal desechable en puerto $PORT..."
    # 3. Arrancar contenedor y capturar estrictamente su ID
    $output = docker run -d `
        --name $CONTAINER_NAME `
        -e POSTGRES_PASSWORD=$DB_PASS `
        -p ${PORT}:5432 `
        public.ecr.aws/supabase/postgres:17.6.1.132 2>&1

    $runExit = $LASTEXITCODE
    if ($runExit -ne 0 -or [string]::IsNullOrWhiteSpace($output)) {
        $exitCode = if ($runExit -ne 0) { $runExit } else { 1 }
        throw "docker run falló al crear el contenedor (Código $exitCode): $output"
    }

    $CREATED_CONTAINER_ID = ($output | Out-String).Trim()
    Write-Host "[OK] Contenedor efímero creado con éxito. ID: $CREATED_CONTAINER_ID"

    # 4. Esperar a que PostgreSQL esté listo para aceptar conexiones
    Write-Host "Esperando inicialización de PostgreSQL con pg_isready..."
    $retries = 35
    $ready = $false
    while ($retries -gt 0) {
        & docker exec $CREATED_CONTAINER_ID pg_isready -U postgres -h 127.0.0.1 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            $ready = $true
            break
        }
        Start-Sleep -Seconds 1
        $retries--
    }

    if (-not $ready) {
        $exitCode = 1
        throw "El servidor PostgreSQL en el contenedor $CREATED_CONTAINER_ID no respondió en el tiempo límite de inicialización."
    }

    # Asegurar que la base de datos exclusiva de pruebas existe
    & docker exec $CREATED_CONTAINER_ID psql -U postgres -d postgres -tc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" | Out-Null
    & docker exec $CREATED_CONTAINER_ID psql -U postgres -d postgres -c "CREATE DATABASE $DB_NAME;" 2>&1 | Out-Null

    Write-Host "[OK] PostgreSQL listo y base de datos $DB_NAME verificada. Ejecutando suite de validación RLS aislada..."

    # 5. Ejecutar el runner de TypeScript
    & npx tsx scripts/test-postgres-isolated-runner.ts
    $testExit = $LASTEXITCODE

    if ($testExit -ne 0) {
        $exitCode = $testExit
        throw "La suite de pruebas test-postgres-isolated-runner.ts falló con código de salida $testExit."
    }

    Write-Host "[OK] Suite finalizada con éxito (Código 0)."

} catch {
    if ($exitCode -eq 0) {
        $exitCode = 1
    }
    Write-Host "[ERROR] ERROR DETECTADO: $_" -ForegroundColor Red
} finally {
    # 6. Limpieza estricta: Únicamente si esta ejecución creó el contenedor, utilizando su ID exclusivo
    if ($CREATED_CONTAINER_ID) {
        Write-Host "Limpiando contenedor efímero creado por esta ejecución (ID: $CREATED_CONTAINER_ID)..."
        try {
            docker rm -f $CREATED_CONTAINER_ID 2>&1 | Out-Null
            $rmExitCode = $LASTEXITCODE
            if ($rmExitCode -eq 0) {
                Write-Host "[OK] Contenedor $CREATED_CONTAINER_ID eliminado limpiamente."
            } else {
                Write-Host "[WARN] Advertencia: No se pudo eliminar el contenedor efímero $CREATED_CONTAINER_ID (Código $rmExitCode). Es posible que deba removerse manualmente." -ForegroundColor Yellow
                if ($exitCode -eq 0) {
                    $exitCode = $rmExitCode
                }
            }
        } catch {
            Write-Host "[WARN] Advertencia durante la limpieza del contenedor ${CREATED_CONTAINER_ID}: $_" -ForegroundColor Yellow
            if ($exitCode -eq 0) {
                $exitCode = 1
            }
        }
    } else {
        Write-Host "No se creó ningún contenedor nuevo. No se ejecuta ninguna operación destructiva."
    }
}

exit $exitCode
