# Cambio Automático de Tema en Cursor

Este script cambia automáticamente el tema de Cursor según la hora del día:

- **Cursor Light**: 7:00 AM - 6:00 PM
- **Dracula Theme**: 6:00 PM - 7:00 AM

## Uso Manual

Para ejecutar el script manualmente:

```powershell
.\switch-theme.ps1
```

## Programar Ejecución Automática

### Opción 1: Programador de Tareas de Windows (Recomendado)

1. Abre el **Programador de tareas** (Task Scheduler)
2. Crea una **Tarea básica**
3. Configura:
   - **Nombre**: Cambiar tema Cursor
   - **Desencadenador**: Diariamente a las 7:00 AM y 6:00 PM
   - **Acción**: Iniciar un programa
   - **Programa**: `powershell.exe`
   - **Argumentos**: `-ExecutionPolicy Bypass -File "<RUTA_HUB>\commands\switch-theme.ps1"`

### Opción 2: Tarea Programada cada hora

Para verificar cada hora y cambiar si es necesario:

1. Crea una tarea que se ejecute **cada hora**
2. Usa los mismos argumentos de PowerShell

### Opción 3: Script de inicio de sesión

Agrega el script a tu perfil de PowerShell para que se ejecute al iniciar sesión:

```powershell
# Agregar al perfil de PowerShell
notepad $PROFILE
```

Y agrega esta línea:

```powershell
& "<RUTA_HUB>\commands\switch-theme.ps1"
```

## Notas

- El script preserva el formato original del archivo `settings.json`
- Cursor necesita ser reiniciado o recargar la ventana (`Ctrl+R`) para aplicar el cambio de tema
- El script muestra mensajes informativos sobre el cambio realizado
