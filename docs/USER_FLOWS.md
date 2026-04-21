# User Flows — MiTechoRentable

Cuatro familias de rol + Time Slider transversal. En UI no usar “Administrador”: la consola operativa es **Operaciones Techos Rentables**. El rol de campo es **Técnico de Campo** (ver `.cursorrules` #4).

---

## 1. Cliente natural (residencial)

**Quién:** propietario residencial; lectura simple, impacto emocional.

**Objetivo:** confianza en la inversión y claridad del rendimiento frente a la promesa comercial.

### Pantallas y piezas

1. **Hero emocional** + **gráfica de contraste (dos líneas):**
   - **Línea punteada:** promesa Techos Rentables (trayectoria objetivo / contrato).
   - **Línea sólida:** rendimiento real medido (misma escala temporal).
2. **Reportes:** descarga **simplificada** (ejecutivo) o **técnica** (más detalle de magnitudes), según toggle o dos botones.
3. **Notificación “Técnico asignado”:** aviso cuando Operaciones TR asigna un Técnico de Campo a su caso (push/in-app + estado en bandeja).

### Transiciones (resumen)

`Login → Hero + gráfica Promesa vs Real → Reportes (PDF) → [evento] notificación técnico asignado`

### Datos clave

- Series para líneas: `GET /stats/{client_id}` o agregados + proyección contrato.
- Reportes: `GET /reports/generate` con parámetro de variante si aplica.

### Estado de implementación UI (abril 2026)

- Shell y navegación cliente natural implementados con componentes reutilizables.
- Vistas implementadas: inicio, rendimiento, reportes, generación de PDF, soporte y perfil.
- Rutas de demo sin auth para revisión visual: `/preview/cliente/*`.
- Tema claro/oscuro activo en todas las vistas mediante `ThemeProvider`.
- Datos residenciales: generadores TypeScript compartidos; opcional **mock-hub** en local si `VITE_STATS_BASE_URL` apunta al servidor (`docs/MOCK_DATA.md`); playground de escenarios en `/dev/mock-hub` (solo desarrollo).
- Pendiente funcional (no visual): conectar datos reales Supabase/FastAPI y Time Slider.

### Guardrails de coherencia visual (cliente natural)

- No crear estilos aislados por vista; usar tokens semánticos globales.
- Reusar `NaturalPageHero`, `NaturalStatCard`, `NaturalActionCard` para mantener ritmo visual y composición.
- Mantener foco de copy en confianza: “promesa vs real”, “ahorro”, “impacto”, “soporte claro”.

---

## 2. Cliente corporativo (industrial)

**Quién:** responsable de activo o energía en empresa; necesita ROI y señales eléctricas.

**Objetivo:** rendimiento financiero, trazabilidad de KPIs y canal de soporte.

### Interfaz — 3 pestañas

| Pestaña | Contenido |
|--------|-----------|
| **1. Rendimiento y ROI financiero** | KPIs de negocio, payback, ahorro acumulado, opcional comparativo vs periodo anterior. |
| **2. Registro KPI** | Tabla o panel denso: **Vo**, **Io**, **fp** (factor de potencia), **Hz**, **Status** (y enlace a alertas si hay desvío). |
| **3. Soporte directo** | Contacto/tickets hacia Operaciones TR; estado de visitas si aplica. |

### Transiciones

`Login → shell con tabs → datos según tab activa → Time Slider (si está habilitado) rebalancea vistas`

### Datos clave

- Tab 1–2: `GET /stats/{client_id}`, lecturas recientes (Supabase/RLS o FastAPI).
- Tab 3: integración con agenda / tickets (`maintenances` / API de mantenimiento).

### Estado de implementacion UI (abril 2026)

- Vista corporativa activa en `/corporativo/dashboard` (y preview) con menu operativo y 3 secciones: ROI, KPI y soporte.
- KPI corporativo muestra error diferenciado por planta (tipo + detalle) y no solo variacion por zona.
- Soporte corporativo incluye tickets con SLA y riesgo financiero estimado.

---

## 3. Operaciones Techos Rentables (consola operativa)

**Quién:** operador central que supervisa 200+ proyectos multi-marca.

**Objetivo:** SLA, agenda, alertas críticas y patrones regionales de falla.

### Pantallas

1. **Fleet Overview (opcional en MVP):** mapa + grid con semáforo por planta.
2. **War Room:** prioridad a **Arco eléctrico**; cada alerta crítica puede mostrar **sugerencia de Técnico de Campo por zona** (matching geográfico / carga).
3. **Panel de agenda:** tabla con columnas: **Nombre** (planta o cliente), **Dirección**, **Último mantenimiento**, **Fecha próximo agendado**, **Problema** (texto breve o ref. ticket).
4. **Analítica regional:** gráfico de barras **frecuencia de falla vs. sector** (eje categorías = sector/`geozone`; altura = conteos o tasa en ventana).
5. **Comparar plantas** (`/operaciones/compare`): selector multi-check (hasta 4 plantas) + tabla comparativa + barras CSS normalizadas de KPIs (`energyKwh`, `powerFactor`, `uptimePct`). Los valores reaccionan a `scenario` y `faultMode` del mock-hub (ej.: `stress` baja PF y uptime; `faultMode≠none` incrementa alertas activas).
6. **Alertas críticas globales** (transversal, `AppShell`): toast in-app (`role="status" aria-live="polite"`, cap 5 FIFO) + modal bloqueante (`role="alertdialog"`) con CTA "Ir al War Room" cuando llega una severidad `critical`. Alimentado por `useCriticalAlerts` (polling 10s sobre `/operations/war-room`, dedup por id, pausa en `visibilityState==='hidden'`, respeta `VITE_SIMULATION_AUTO_REFRESH`).

### Transiciones

`Login → War Room / Agenda / Analítica según navegación → detalle planta → asignación técnico`

### Datos clave

- Alertas: `GET /alerts`, `WS /ws/alerts`.
- Barras por zona: `GET /analytics/faults-by-zone`.
- Agenda: `GET /maintenance/schedule` (+ tabla `maintenances` en Supabase).

### Estado de implementacion UI (abril 2026)

- Login con bypass local para Operaciones TR habilitable por env (`VITE_ENABLE_OPERATIONS_MOCK_AUTH`).
- Rutas operativas protegidas activas: `/operaciones/dashboard`, `/operaciones/plants/:plantId`, `/operaciones/agenda`, `/operaciones/war-room`, `/operaciones/analytics`, `/operaciones/compare` (+ `/preview/operaciones/compare` para revisión visual sin auth).
- Vistas A1-A5 implementadas con datos mock tipados alineados a `Alert`, `MaintenanceScheduleRow` y `FaultsByZoneResponse`.
- Página "Comparar plantas" publicada (`OperationsComparePlantsPage.tsx`) con soporte de `FleetPlant.kpis?` (energía/PF/uptime) derivado en mock-hub según escenario.
- Alertas críticas globales integradas en `AppShell` (`useCriticalAlerts`): toasts + modal bloqueante con deep-link al War Room para rol `operations`.
- Pendiente funcional (no visual): conectar endpoints reales FastAPI/Supabase y realtime de alertas (WebSocket `/ws/alerts`).

---

## 4. Técnico de Campo

**Quién:** técnico con dispositivo móvil en techo o planta; red intermitente.

**Objetivo:** ruta eficiente, telemetría usable offline y cierre formal de visita.

### Pantallas y piezas

1. **Hoja de ruta por zona:** lista ordenada de visitas (planta, dirección, ventana sugerida); integración con agenda de Operaciones TR.
2. **Telemetría con buffer local (offline):** lecturas y formularios se encolan en **buffer local** (IndexedDB / SQLite capa app); al recuperar conectividad se sincroniza con Supabase/FastAPI sin perder orden ni duplicar por idempotencia.
3. **Switch de cierre de mantenimiento:** acción explícita al completar visita; dispara `POST /maintenance/complete` y actualiza estado en agenda.

### Transiciones

`Login → Ruta por zona → Planta (live + buffer) → Cierre mantenimiento → sync`

### Datos clave

- Lecturas: últimas `readings`; en offline solo buffer + reintentos.
- Cierre: `POST /maintenance/complete` con `maintenance_id` o ticket equivalente.

### Estado de implementacion UI (abril 2026)

- Vistas tecnico activas en `/tecnico/ruta`, `/tecnico/telemetria`, `/tecnico/salud`, `/tecnico/cierre` (y preview).
- Telemetria integra estado live/buffer y cola offline mock con accion de sincronizacion.
- Cierre de mantenimiento expone checklist, notas y confirmacion de envio mock de `POST /maintenance/complete`.

---

## Time Slider (transversal, modo demo)

Todos los flujos pueden integrar un **slider temporal** que mueve `t` sobre datos históricos; las pantallas re-renderizan el estado en ese instante (arco / degradación / fatiga). Obligatorio para la demo (ver `context.md`).

**Estado de implementación (abril 2026):** disponible como hook compartido `useTimeWindow` (`frontend/src/hooks/useTimeWindow.ts`) y componente `TimeSlider` (`frontend/src/components/TimeSlider.tsx`). Integrado en War Room (`/operaciones/war-room`) y Dashboard cliente (`/dashboard`). Persistido en localStorage (`solarpulse.timeWindow.v1`) y sincronizado entre pestañas vía evento `solarpulse:time-window`. Backend expone `GET /sim/time-meta` (`contractVersion=2026-04-18.sim.v1`) con el rango disponible.
