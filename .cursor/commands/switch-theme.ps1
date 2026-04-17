# Script para cambiar el tema de Cursor según la hora del día
# Tema claro (Cursor Light): 7:00 AM - 6:00 PM
# Tema oscuro (Dracula Theme): 6:00 PM - 7:00 AM

$settingsPath = "$env:APPDATA\Cursor\User\settings.json"
$currentHour = (Get-Date).Hour
$currentMinute = (Get-Date).Minute
$currentTime = "$($currentHour.ToString('00')):$($currentMinute.ToString('00'))"

# Determinar qué tema debería estar activo
$shouldBeLight = ($currentHour -ge 7 -and $currentHour -lt 18)
$targetTheme = if ($shouldBeLight) { "Cursor Light" } else { "Dracula Theme" }

# Leer el archivo de configuración
if (Test-Path $settingsPath) {
    $settingsContent = Get-Content $settingsPath -Raw -Encoding UTF8

    # Usar expresión regular para encontrar y reemplazar el tema, preservando el formato
    $pattern = '"workbench\.colorTheme"\s*:\s*"[^"]+"'

    if ($settingsContent -match $pattern) {
        # Extraer el tema actual
        $match = [regex]::Match($settingsContent, $pattern)
        $currentThemeLine = $match.Value
        $currentTheme = $currentThemeLine -replace '.*"workbench\.colorTheme"\s*:\s*"', '' -replace '".*', ''

        if ($currentTheme -ne $targetTheme) {
            $replacement = '"workbench.colorTheme": "' + $targetTheme + '"'
            $updatedContent = $settingsContent -replace [regex]::Escape($currentThemeLine), $replacement

            # Guardar el archivo preservando el formato original
            [System.IO.File]::WriteAllText($settingsPath, $updatedContent, [System.Text.Encoding]::UTF8)

            Write-Host "Tema cambiado de '$currentTheme' a '$targetTheme' (Hora: $currentTime)" -ForegroundColor Green
        } else {
            Write-Host "El tema ya está configurado correctamente: $targetTheme (Hora: $currentTime)" -ForegroundColor Yellow
        }
    } else {
        Write-Host "No se encontró la configuración 'workbench.colorTheme' en el archivo" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "No se encontró el archivo de configuración en: $settingsPath" -ForegroundColor Red
    exit 1
}
