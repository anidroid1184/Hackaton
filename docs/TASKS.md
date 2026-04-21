# Tablero de tareas — MiTechoRentable (Hackathon)

**Rama activa de trabajo:** `develop`. **Documentación:** `docs/USER_FLOWS.md`, `docs/DATABASE.md`, `docs/API_SPEC.yml`, `docs/ENVIRONMENT.md`, `docs/MOCK_DATA.md`, `docs/api/README.md`.

**Nombres en UI:** usar **Operaciones Techos Rentables** (no «Administrador») y **Técnico de Campo** (ver `docs/USER_FLOWS.md`).

---

## Kanban global

### TODO

- Migraciones Supabase según `docs/DATABASE.md` + RLS mínimo (`profiles`, `plants`, `readings`, `alerts`).
- Tabla **`maintenances`** (agenda) + `geozone` en `plants` (o equivalente) para analítica por zona — ver Sebastián.
- Cliente Supabase en frontend (`@supabase/supabase-js@^2.70`) + variables de entorno documentadas.
- **P2 contratos y fixtures multi-proveedor:** extender `docs/API_SPEC.yml` (rutas MVP + estado implemented/planned, `RawReading {value, unit}`, nota canónica/pf) y crear `backend/tests/fixtures/mock_providers/` con README para fallback live→mock.

### IN PROGRESS

- (asignar en daily)

### DONE

- Arquitectura y contrato API documentados (`develop`).
- Frontend cliente natural: sistema visual unificado (tokens), tema claro/oscuro y shell reusable.
- Frontend cliente natural: vistas demo reutilizables de inicio, rendimiento, reportes, PDF, soporte y perfil.
- **Backend sprint 1 — `/ingest` + Magnitude Inference Engine** (`backend/domain/`, `backend/schemas/ingest.py`, `backend/security/ingest_key.py`, `backend/persistence/supabase_rest.py`, `backend/providers/{base,deye_mock,deye_live}.py`, `backend/routers/ingest.py`): normalización agnóstica de hardware (alias + rango físico), persistencia PostgREST con `service_role`, `X-Ingest-Key` con `hmac.compare_digest`. Cobertura: 65 tests (unit + integration + E2E con snapshot Deye real).
- **Backend sprint 2 (slice 1) — `GET /stats/{client_id}` + compat slider** (`backend/routers/stats.py`, `backend/domain/stats.py`, `backend/persistence/stats_repo.py`, `backend/schemas/stats.py`, `backend/tests/{unit,integration}/test_stats_*`): endpoint user-facing con JWT Supabase, ventana temporal `from/to` para Time Slider, agregación de KPIs (energía, ROI, CO2, pf). Cobertura backend actual: 70 tests.
- **Backend sprint 3 (MVP alignment) — endpoints operaciones/corporativo/técnico + cache TTL** (`backend/routers/mvp.py`, `backend/domain/mvp_data.py`, `backend/cache/{ttl,store}.py`, `backend/routers/{stats,ingest}.py`, `backend/tests/{integration,unit}/test_{mvp_endpoints,cache_ttl,ttl_cache}.py`): frontend consume backend normalizado (sin mocks directos en pantallas core), cache in-memory con invalidación en `/ingest`, RBAC y contratos MVP alineados. Cobertura backend actual: 80 tests.
- **Frontend MVP adapters** (`frontend/src/lib/roleDashboardApi.ts`, `frontend/src/lib/{roleDashboardApi,naturalStatsApi}.test.ts`, páginas `Operations*`, `CorporateClientPage`, `FieldTechnician*`, `App.tsx`, `ProtectedRoute.test.tsx`): consumo de APIs backend con `Bearer` + fallback local controlado; rutas por rol endurecidas.
- **Mock datos residenciales:** `frontend/src/lib/residentialGenerators.ts` + `naturalStatsApi.ts`; servidor opcional `mock-hub/` (mismos generadores); documentado en `docs/MOCK_DATA.md` y `mock-hub/README.md`.
- **Simulador multi-perfil provider-first + mapeador multi-proveedor** (`mock-hub/src/{server,multiProfileData,providerSim,simulationParams}.ts`, `mock-hub/src/server.test.ts`, `backend/providers/adapters.py`, `backend/domain/{magnitudes,inference}.py`, `backend/tests/unit/test_{provider_adapters,magnitude_mapper_multi_provider}.py`, `frontend/src/lib/{roleDashboardApi,naturalStatsApi}.ts`): endpoints multi-perfil en un puerto, simulación `deye/huawei/growatt` con envelopes/timestamps realistas, capa `provider -> raw -> canonical`, y fallback local robusto en frontend. Validado con tests backend/frontend/mock-hub.
- **P1 documentación modos + entorno (proveedor/simulación):** actualización de `docs/MOCK_DATA.md`, `docs/ENVIRONMENT.md`, `docs/api/README.md`, `mock-hub/README.md`, `.env.example` y referencias cruzadas en `docs/{ARCHITECTURE,CONVENTIONS}.md` para reflejar fallback live→mock y visión multi-perfil con servidor externo.
- **P0 doc-sync + pruebas mínimas endpoints reales:** actualización de `docs/DATABASE.md` (relaciones `client_users`, `zones`, `maintenances`), ajuste de `docs/API_SPEC.yml` (payloads reales de maintenance/faults) y pruebas deterministas de `GET /analytics/faults-by-zone`, `GET /maintenance/schedule`, `POST /maintenance/complete` en `backend/tests/integration/test_mvp_endpoints.py`.
- **Onda 5/6 — hardening contratos MVP por rol + simulate:** backend con filtros/scope/csv en analytics y maintenance (`GET /analytics/faults-by-zone(.csv)`, `GET /maintenance/schedule(.csv)`), acciones de mantenimiento (`PATCH /maintenances/{maintenance_id}`, `POST /maintenances/{maintenance_id}/cancel`), endpoint operacional de resumen live (`GET /operations/telemetry-overview`) y contrato de simulación versionado (`GET /sim/meta`, `contractVersion=2026-04-18.sim.v1`).
- **Demo-ready paralelo (pre-pitch)** — 4 lotes en paralelo para preparar pruebas reales:
  - **Lote A — 4 roles reales + seed de usuarios Supabase:** `supabase/migrations/20260418120000_four_roles_and_seed_users.sql` migra `profiles.role` a `('client','operations','corporate','technician')` (1-a-1 con `AppRole` del frontend), reescribe `handle_new_user` para respetar `user_metadata.role` + `organization_slug` con fallbacks seguros. `scripts/seed_demo_users.py` (stdlib, idempotente) crea/actualiza los 4 usuarios demo vía Auth Admin API, sincroniza `profiles` y linkea `client_users` por org (`default`/`tr-demo`). Documentado en `docs/ENVIRONMENT.md`.
  - **Lote B — sliders dinámicos end-to-end:** `frontend/src/lib/simulationContext.ts` ahora propaga también `noise/scale/phase/profile` (leídos de `sessionStorage[solarpulse.mockScenario.v1]`) a todas las rutas vía `appendSimulationContextParams`, cubriendo `/operations/*`, `/technician/*`, `/corporate/*` además de `/stats`. `mock-hub/src/multiProfileData.ts` añade `phaseShift` + `profileBias` (neutros por default). Panel `/dev/mock-hub` gana botón "Randomizar" que aplica en un click. Tests: `roleDashboardApi.test.ts` + `mock-hub/src/server.test.ts`.
  - **Lote C — dashboards vivos cada 5s:** nuevo hook `frontend/src/hooks/useSimulationAutoRefresh.ts` que dispara `MOCK_SCENARIO_CHANGE_EVENT` cada 5s (controlado por `VITE_SIMULATION_AUTO_REFRESH`, default `true`), integrado en `DashboardNaturalPage`, `OperationsFleetPage`, `FieldTechnicianTelemetryPage`, `CorporateClientPage`. `mock-hub` expone `GET /sim/health` con `seedTick` alineado al mismo intervalo.
  - **Lote D — smoke de demo en 2 comandos:** `scripts/demo_smoke.sh` orquesta `supabase start` + `supabase db reset` + `seed_demo_users.py` + `manage.py runserver --simulate` en background + healthchecks + login HTTP 200 por cada rol (`/auth/v1/token?grant_type=password`). Documentado en `README.md` como "Demo real en 2 comandos". Verificación E2E pendiente de corrida final manual.
- **Onda 7 — Time Slider transversal (X1/C8) + /sim/time-meta:** componente React `TimeSlider` con presets 24h/7d/30d/custom, hook `useTimeWindow` persistido en localStorage, cableo en War Room y Dashboard cliente con propagación `from`/`to`, endpoint backend `GET /sim/time-meta` (contractVersion 2026-04-18.sim.v1).
- **Onda 8 — Operario "Comparar plantas" + Alertas intrusivas globales + fixes P0 de diseño:** ejecución paralela de 5 agentes sobre archivos disjuntos + orquestador:
  - **Comparar plantas (operario):** nueva página `OperationsComparePlantsPage.tsx` con selector multi-check (≤4) + tabla + barras CSS normalizadas; shape `FleetPlant.kpis?` (energyKwh/powerFactor/uptimePct) extendido en `operationsMockData.ts`, validador `isFleetPlant` en `roleDashboardApi.ts`, seed determinista por hash en `backend/domain/mvp_data.py`, derivación dinámica en `mock-hub/src/multiProfileData.ts` (`stress` baja PF -15% y uptime -5pp; `degraded/faultMode` +1 activeAlert). Ruta `/operaciones/compare` + preview `/preview/operaciones/compare` + item nav "Comparar plantas".
  - **Alertas intrusivas globales:** hook `frontend/src/hooks/useCriticalAlerts.ts` (polling 10s a `/operations/war-room` solo para operaciones, dedup por id, pausa en `visibilityState==='hidden'`, respeta `VITE_SIMULATION_AUTO_REFRESH`). `AppShell.tsx` añade región `role="status" aria-live="polite"` para toasts (cap 5, FIFO) y `role="alertdialog"` modal bloqueante cuando llega `critical` con CTA "Ir al War Room".
  - **Diseño P0:** `DashboardNaturalPage.tsx` `key={i}` → `key={id}` estable con `useMemo`, botón "Ver agenda" → `<Link to="/agenda">`; `ProfileNaturalPage.tsx` eliminado (huérfano); labels + `htmlFor` agregados en `OperationsTechniciansPage` (3 campos), `FieldTechnicianTelemetryPage` (nota), `FieldTechnicianClosePage` (textarea cierre); botones muertos cableados en `SupportNaturalPage` (scroll a PQRS) y `CorporateClientPage` ("Crear ticket" → `<Link to="/support">`); topbar demo ahora deriva del `variant` activo + sufijo "· Demo".

---

## Sebastián

**Enfoque:** Supabase (migraciones, RLS, seeds demo), FastAPI (inteligencia mínima), integración middleware Tinku → `/ingest`, envs, Docker si aplica.

- 🔲 **P0** Migración inicial: `organizations`, `profiles`, `clients`, `plants`, `devices`, `readings`, `alerts`, `maintenance_tickets`.
- 🟡 **P0** Tabla **`maintenances`** (agenda): contrato/documentación y tests de endpoints listos; falta migración SQL + RLS por org.
- 🟡 **P0** Lógica de **agrupación por zona** (`geozone`): endpoint y pruebas de contrato listos; falta persistencia real con `zones` + `plants.zone_id` en DB.
- 🔲 **P0** Seed demo: 1 org, 2 plantas, lecturas sintéticas + alertas de prueba (arco / degradación).
- ✅ **P0** FastAPI: middleware CORS + dependencia `verify_supabase_jwt` en rutas user; header `X-Ingest-Key` en `/ingest` (**DONE**: `backend/routers/ingest.py` + `backend/security/ingest_key.py`, 65 tests verdes).
- ✅ **P1** Ruta `GET /stats/{client_id}` compatible con slider (`from`/`to`) (**DONE**: `backend/routers/stats.py` + `backend/domain/stats.py` + `backend/persistence/stats_repo.py`, tests verdes).
- ✅ **P1** Rutas `GET /maintenance/schedule`, `POST /maintenance/complete` según `docs/API_SPEC.yml` (**DONE MVP**: `backend/routers/mvp.py`).
- ✅ **P1** Rutas `GET /alerts` y `GET /analytics/faults-by-zone` con JWT (**DONE MVP**: `backend/routers/mvp.py`, cache TTL en analytics).
- 🔲 **P1** Script o job que llame al middleware Tinku y empuje a `/ingest` (ver `docs/resources/technical_guide.md`).
- 🔲 **P1** WebSocket o long-poll `/alerts` alineado con `docs/API_SPEC.yml`.
- 🔲 **P1** Estabilizar smoke Deye (`docs/api/deye/smoke_test.sh`): resolver `HTTP 502` en `station/latest`, `station/history`, `station/history/power`, `station/alertList` (upstream auth refresh).

---

## Isabel — Frontend (UI/UX, cliente residencial y corporativo)

**Enfoque:** flujos **Cliente natural** y **Cliente corporativo**; coherencia visual; apoyo al pitch.

### Vistas a construir (orden sugerido)

| # | Vista / pantalla | Descripción | Datos (referencia) |
|---|------------------|-------------|---------------------|
| C1 | **Shell app** | Layout común: nav mínima, zona de contenido, modo claro/oscuro opcional | — |
| C2 | **Login** | Email/contraseña vía Supabase Auth (`signInWithPassword`); redirect post-login | Supabase Auth |
| C3 | **Cliente — Hero emocional** | Grandes KPIs del día: kWh, $ ahorro estimado, sensación “hoy fue buen día” | Vista/RPC o mock → luego `readings` + tarifa |
| C3b | **Cliente residencial — Promesa vs Real** | Gráfica **2 líneas**: punteada = promesa TR, sólida = real (misma ventana temporal) | `GET /stats/{client_id}` + serie promesa |
| C4 | **Cliente — ROI** | Gráfica línea/área: ganancia acumulada vs tiempo; marca payback | `GET /stats/{client_id}` o agregados |
| C5 | **Cliente — Ambiental** | CO2 evitado + equivalencia árboles (iconos, pocos números) | stats / factor en `clients` |
| C6 | **Cliente — Reportes** | PDF simplificado vs técnico (toggle o dos acciones); periodo mes/trim/año; `GET /reports/generate` | FastAPI + JWT |
| C6b | **Cliente — Notificación técnico asignado** | Banner/toast cuando exista asignación en `maintenances` / evento Realtime | Supabase + política por `client_id` |
| C7 | **Cliente corporativo — 3 pestañas** | **[1]** Rendimiento y ROI financiero · **[2]** Registro KPI (Vo, Io, fp, Hz, Status) · **[3]** Soporte directo | `GET /stats`, lecturas, tickets |
| C8 | **Time Slider (Cliente)** | Slider que filtra `t` y refresca vistas cliente | `readings` por rango |

**Criterios:** menos texto, más jerarquía visual; mobile-first; accesible (contraste, `aria` en gráficas).

### Estado actual (actualizado)

- ✅ **C1 Shell app** completado (desktop + mobile, navegación y componentes reutilizables).
- ✅ **C2 Login** completado (flujo funcional y redirect post-login).
- ✅ **C3 Hero emocional** completado.
- ✅ **C3b Promesa vs Real** completado.
- ✅ **C5 Ambiental** completado.
- ✅ **C6 Reportes** completado con vista de historial y acciones.
- ✅ **Generación de PDF** integrada end-to-end (`/reports/pdf` -> `GET /reports/generate`) con 4 combinaciones Natural/Jurídico-Corporativo x Simplificado/Técnico y descarga backend.
- ✅ **Soporte** completado (canales, tickets, FAQ + radicación PQRS mínima).
- ✅ **Perfil de usuario** completado (datos + preferencias + tema + preferencias de contacto soporte/PQRS).
- ✅ **C4 ROI** completado en consola corporativa (tab de rendimiento y comparación real vs objetivo).
- 🟡 **C6b Notificación técnico asignado** parcial (notificaciones transversales y acceso rápido a soporte listos; falta evento realtime real).
- ✅ **C8 Time Slider (Cliente)** integrado en Dashboard natural (hook compartido).

---

## Santiago — Frontend (Operaciones TR + Técnico de Campo)

**Enfoque:** vistas **Operaciones Techos Rentables** y **Técnico de Campo**; tablas, alertas, variables en vivo, agenda y analítica regional.

### Vistas a construir (orden sugerido)

| # | Vista / pantalla | Descripción | Datos (referencia) |
|---|------------------|-------------|---------------------|
| A1 | **Operaciones TR — Fleet Overview** | Lista/grid de plantas: nombre, cliente, semáforo (uptime/alertas), link a detalle | `plants` + join `clients` + agregados |
| A2 | **Operaciones TR — Detalle planta** | Resumen planta + acceso a mantenimientos y alertas | `plants`, `alerts` |
| A3 | **Operaciones TR — Panel de agenda** | Tabla: Nombre, Dirección, Último mantenimiento, Fecha próximo agendado, Problema | `GET /maintenance/schedule`, `maintenances` |
| A4 | **Operaciones TR — War Room** | Alertas priorizadas (Arco eléctrico al frente); **sugerencia de Técnico de Campo por zona** en cada ítem crítico | `alerts`, `GET /analytics/faults-by-zone`, perfiles técnicos + `geozone` |
| A5 | **Operaciones TR — Analítica regional** | Gráfico de barras: frecuencia de falla vs. sector | `GET /analytics/faults-by-zone` |
| T1 | **Técnico de Campo — Ruta por zona** | Lista ordenada de visitas del día/semana por zona | `maintenances` + mapa opcional |
| T2 | **Técnico de Campo — Variables en vivo + buffer offline** | Panel en vivo; cola local si no hay red; sync al reconectar | `readings`, buffer IndexedDB/SQLite |
| T3 | **Técnico de Campo — Salud preventiva** | Cards: Arco, Degradación, Breaker, Temp inversor | `alerts` + lecturas |
| T4 | **Técnico de Campo — Cierre mantenimiento** | Switch/acción “Completar visita” → `POST /maintenance/complete` | FastAPI + JWT |
| X1 | **Time Slider (global)** | Componente compartido: prop `t` o rango; estado en URL opcional (`?t=`) | `readings` / RPC rango |

**Criterios:** en UI usar siempre **Operaciones Techos Rentables**, no “Administrador”; War Room legible en laptop; estados offline visibles para Técnico de Campo.

### Estado actual (actualizado)

- ✅ **A1 Fleet Overview** completado con semaforo de estado, zona y alertas.
- ✅ **A2 Detalle planta** completado con metricas base y alertas recientes.
- ✅ **A3 Panel de agenda** completado (tabla con columnas operativas).
- ✅ **A4 War Room** completado con priorizacion y tecnico sugerido por zona.
- ✅ **A5 Analitica regional** completado (barras de fallas por sector).
- ✅ **T1 Ruta por zona** completado.
- ✅ **T2 Telemetria + buffer offline** completado (estado mock con cola y sincronizacion).
- ✅ **T3 Salud preventiva** completado con checklist operativo.
- ✅ **T4 Cierre mantenimiento** completado con flujo UI y endpoint backend (`POST /maintenance/complete`) con soporte de `notes`, `checklist` y `evidence`.
- ✅ **T4b Reagendar/Cancelar mantenimiento (backend)** disponible en contrato MVP (`PATCH /maintenances/{maintenance_id}` y `POST /maintenances/{maintenance_id}/cancel`); integración visual completa queda como ajuste incremental de UX.
- ✅ **X1 Time Slider global** disponible con hook compartido `useTimeWindow` + componente `TimeSlider`, integrado en War Room y Dashboard cliente.

---

## Coordinación Isabel ↔ Santiago

| Tema | Acuerdo |
|------|---------|
| **Design tokens** | Tipografía, espaciado, colores semáforo (verde/ámbar/rojo) — definir una vez en `index.css` o tema Tailwind compartido |
| **Time Slider** | Santiago puede implementar el componente base (**X1**); Isabel lo integra en flujo Cliente (**C8**) |
| **Auth** | Misma pantalla **Login (C2)**; roles distintos redirigen a `/cliente`, `/operaciones` o `/tecnico` según `profiles.role` |
| **API** | Llamadas a FastAPI con `Authorization: Bearer <access_token>` desde `supabase.auth.getSession()` |

---

## Checklist previo a demo

- ✅ Login funciona (4 roles — `cliente`/`operaciones`/`corporativo`/`tecnico` — sembrados vía `scripts/seed_demo_users.py` + validado HTTP 200 por `scripts/demo_smoke.sh`). Credenciales en `.env` (`VITE_*_MOCK_{EMAIL,PASSWORD,NAME}`), documentadas en `docs/ENVIRONMENT.md`.
- ✅ Time Slider mueve datos en War Room (Operaciones TR) y Dashboard (Cliente natural).
- ✅ War Room muestra ≥1 alerta crítica demo (mock-hub inyecta con `faultMode!=='none'`) y sugerencia de técnico por zona. Modal intrusivo bloqueante + toasts globales wired en AppShell.
- ✅ Comparar plantas (operario) disponible en `/operaciones/compare` con KPIs (energía, PF, uptime) sensibles a `scenario` y `faultMode`.
- 🔲 Cliente muestra hero + una gráfica ROI (aunque sea mock).

---

## Roadmap post-pitch

- Tinku middleware → `/ingest` (cron/worker) para dato live multi-proveedor.
- Estabilizar smoke Deye (upstream 502 en station/latest, station/history, station/alertList).
- WebSocket `/ws/alerts` para push en War Room (<5 min end-to-end).
- Batch mensual automatizado de PDFs (200 clientes) para evidenciar -130h/mes.

---

## Cierre de sprint

Actualizar este archivo al mover tareas entre columnas TODO / IN PROGRESS / DONE.
