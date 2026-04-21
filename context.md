# MiTechoRentable — Contexto Estratégico

> Fuente única de verdad estratégica. Antes de cualquier feature: leer esto + `docs/ARCHITECTURE.md` + `docs/USER_FLOWS.md`.

**Propuesta de valor:** *Centralizamos el sol. Transformamos datos fragmentados en cumplimiento contractual, rentabilidad y tranquilidad.*

**MiTechoRentable** centraliza **200+ proyectos solares multi-marca** (inversores/medidores heterogéneos: Huawei, Growatt, Fronius, Sungrow, etc.) en una sola plataforma. Los datos históricos son la **fuente de verdad** para:

## El problema: «La ceguera operativa y el impuesto del silo»

**Techos Rentables** gestiona una infraestructura crítica (**200+ plantas solares**) pero opera atrapada en un ecosistema **fragmentado**. El problema se articula en cuatro pilares:

1. **Fragmentación multimarca (el silo).** Cada fabricante (p. ej. Huawei, Growatt, Deye) tiene su propia plataforma, su propio acceso a datos (p. ej. MODBUS RTU detrás del portal) y su **nomenclatura**. Comparar el rendimiento entre clientes con inversores distintos no es posible de forma nativa.
2. **Fuga masiva de productividad.** El equipo pierde del orden de **130 horas mensuales** copiando y pegando datos entre plataformas para armar informes ejecutivos y de cliente.
3. **Riesgo contractual inminente (SLA).** Los contratos exigen **detectar fallas en menos de ~5 minutos**. Hoy la operación es reactiva: muchas caídas se conocen cuando **el cliente llama**, con exposición a multas y litigios.
4. **Caos de nomenclatura.** Los datos existen, pero «hablan distintos idiomas»: un proveedor etiqueta voltaje como `u_a`, otro `Output Voltage`, otro `Grid Voltage` — lo que **impide analítica global** sin capa de normalización.

> **Referencia del reto (solo lectura):** el enunciado institucional y el contexto operacional detallado siguen en [`docs/problem/problema.md`](docs/problem/problema.md) y [`docs/problem/contexto_operacional.md`](docs/problem/contexto_operacional.md) — **no se versionan desde este documento.**

---

## La solución: SolarPulse

**SolarPulse** es un sistema de **inteligencia de activos solares** agnóstico al hardware. Se obtienen datos vía **middleware Tinku** (APIs/polling por marca), se **normalizan** en el borde de ingesta y se convierten en **información accionable** orientada a negocio y mantenimiento preventivo.

Flujo resumido (detalle técnico en [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)):

`Inversores / medidores (multimarca)` → **Middleware Tinku** (payload crudo, nombres heterogéneos) → **FastAPI** (`POST /ingest`, inferencia de magnitud) → **Supabase** (Postgres: verdad histórica, Auth, RLS) → **React** (Mission Control, cliente, Field Ops).

---

## Módulos de producto (A / B / C)

### Módulo A — The Intelligence Core (backend, FastAPI)

Motor que procesa y estandariza la «verdad» operativa.

| Componente | Descripción |
|------------|-------------|
| **Inferencia de magnitud** | *Killer feature* técnica: se ignoran nombres de variables del proveedor; se etiquetan magnitudes por **comportamiento físico** (rangos plausibles, unidades). Nuevas marcas se incorporan sin reescribir integraciones por cada string nuevo. |
| **SLA-Guardian** | *Diseño objetivo:* job con **polling periódico (p. ej. cada 5 min)** que refuerza la promesa de disponibilidad y detección temprana. La existencia en código (cron, colas) puede ser parcial en el hackathon — tratar como **objetivo de producto** hasta que el repo lo implemente de punta a punta. |
| **Analizador de degradación preventiva** | Seguimiento de histórico de **factor de potencia** y eficiencia; ante caída silenciosa y progresiva, elevar **ticket de mantenimiento sugerido** antes del fallo duro. *Objetivo de producto* si aún no hay tickets automáticos en el código. |

### Módulo B — Mission Control (frontend ejecutivo, React)

Dashboards con poco ruido, foco en valor financiero y ambiental (ver [`docs/USER_FLOWS.md`](docs/USER_FLOWS.md)).

| Vista | Rol / uso | Función |
|-------|-----------|---------|
| **War Room** | Operaciones Techos Rentables (vista global) | Prioriza emergencias; alertas intrusivas (p. ej. arco eléctrico); **sugerencia de técnico por zona**; despacho. |
| **Financial Twin** | Cliente corporativo | Traduce kWh a dinero; ROI en vivo; inversión vs ahorro acumulado. |
| **Vista residencial / emocional** | Cliente residencial | Impacto ambiental intuitivo; CO₂ evitado con **matriz energética local**. Ejemplo de cálculo ilustrativo: **CO₂ mitigado (kg) ≈ Energía (kWh) × factor de emisión** — p. ej. **0,126 kg/kWh** donde aplique la red local; en base de datos el factor configurable por cliente está en `clients.grid_emission_factor_kg_co2_per_kwh` (ver [`docs/DATABASE.md`](docs/DATABASE.md)). |
| **Eco-Report on-demand** | Cliente | Un botón genera y exporta informe histórico en **PDF** al instante (sustituye horas de trabajo manual). |

### Módulo Operador TR (Operaciones Techos Rentables)

Capacidades internas para quien **gestiona todas las plantas** (clientes residenciales y corporativos) desde un solo perfil operativo (en UI: **Operaciones Techos Rentables**, no «Administrador»).

| Capacidad | Descripción |
|-----------|-------------|
| **Gestor de logística y mantenimiento** | Agenda de visitas, seguimiento de mantenimientos y coordinación con **Técnico de Campo** (ver [`docs/USER_FLOWS.md`](docs/USER_FLOWS.md), `GET /maintenance/schedule`). |
| **Analítica epidemiológica de fallas por sector** | Vista agregada: frecuencia y patrones de falla por región/sector para priorizar refuerzos y repuestos (`GET /analytics/faults-by-zone`). |

**Lógica de negocio — mapeo geográfico de errores:** las alertas y lecturas se asocian a **geozona** (y a planta). El motor distingue señales coherentes con **falla de red / conectividad** (patrones multi-planta, correlación temporal regional) frente a **falla de equipo** (aislada a planta/dispositivo). Esa clasificación alimenta el War Room y la analítica regional (detalle en [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)).

**Visión futura — Rootwave Triage Agent:** agente de IA de **primer nivel** para triage de incidencias (sugerencias de causa, pasos iniciales y escalado a humano). *Roadmap de producto; no asumir implementación en el repo salvo decisión explícita del equipo.*

### Módulo C — Field Ops (frontend técnico, React / PWA)

Herramientas de campo.

| Vista | Función |
|-------|---------|
| **Field-Command** | Vista móvil simple para **Técnico de Campo**: telemetría con **buffer local (offline)** en techos con señal intermitente; sincronización al recuperar red; cierre de mantenimiento vía `POST /maintenance/complete`. Ver [`docs/USER_FLOWS.md`](docs/USER_FLOWS.md) y [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md). |

---

## Diferenciadores (pitch)

1. **Enfoque de negocio, no solo de datos.** La plataforma protege **contratos**, reduce riesgo de **multas** y ataca las **~130 h/mes** de trabajo manual — no es solo otro dashboard de curvas.
2. **Agnosticismo radical.** La inferencia de magnitud permite que Techos Rentables cambie de marca de inversor sin reescribir toda la integración por nomenclatura.
3. **Proactividad vs reactividad.** De «el cliente llama furioso» a un **War Room** que detecta fatiga en breakers, arcos y señales de degradación en tiempo operativo útil.
4. **Modo demo dinámico.** **Time Slider** sobre datos históricos para demostrar en vivo reacción ante degradación y disparo de alertas (ver sección siguiente).

---

## Diferenciadores (core técnico)

1. **Inferencia de Magnitud (agnóstico de hardware).** Los proveedores envían nombres distintos (`Pac`, `ActivePower`, `P_total`, `kW_inv_1`…). MiTechoRentable mapea variables por **rango físico + unidad inferida** (p.ej. potencia activa en kW entre [0, 2·Pnom]), no por nombre del fabricante. Regla: **si la magnitud encaja, el mapeo se acepta**.
2. **Análisis de Degradación.** Detección de **caída gradual de rendimiento** (ratio generación_real / generación_teórica con ajuste por irradiancia/temperatura) sobre ventana móvil. Distingue suciedad/shading transitorio vs. degradación estructural (pendiente sostenida en el tiempo).

## Módulo Operador Techos Rentables (TR)

Capacidades de operación central además del fleet y alertas:

- **Gestor de Logística y Mantenimiento:** agenda de visitas, estados de ticket y cierre auditado alineado con **Técnico de Campo**.
- **Analítica Epidemiológica de Fallas por Sector:** vista agregada de frecuencia y patrones de falla por región (sector / `geozone`), no solo por planta aislada.

## Lógica de negocio — Mapeo geográfico de errores

Las incidencias se contextualizan en **mapa** y en **zona** para separar:

- **Fallas de red / comunicación** (p. ej. pérdida prolongada de telemetría sin correlato eléctrico en el inversor).
- **Fallas de equipo** (señales coherentes con anomalía en magnitudes físicas o alertas de arco/degradación en el activo).

Esa distinción alimenta priorización en **Operaciones Techos Rentables** y el gráfico regional (frecuencia vs. sector).

## Visión futura — Rootwave Triage Agent

**Rootwave Triage Agent:** asistente de IA orientado a **resolución de problemas nivel 1** (triaje inicial: clasificación de síntomas, sugerencias de comprobación y escalamiento cuando el caso requiere Técnico de Campo). No sustituye el juicio humano; reduce tiempo hasta la acción correcta.

## KPIs Core

| KPI | Fórmula / Señal | Audiencia |
|---|---|---|
| **Energía generada (kWh)** | `∫ P_active dt` agregado por planta/cliente | Operaciones TR, Cliente, Técnico de Campo |
| **Ahorro monetario acumulado** | `kWh_generados × tarifa_local - costos_OPEX` | Cliente (dashboard emocional) |
| **CO2 mitigado** | `kWh × factor_red` + equivalencia visual (árboles) | Cliente |
| **Uptime contractual** | `% horas_sol_con_generación_válida / horas_sol_esperadas` | Operaciones TR (SLA) |
| **Factor de Potencia (Salud del Breaker)** | `cos(φ)` y alertas por desvío → proxy de fatiga eléctrica y riesgo de arco | Técnico de Campo, Operaciones TR |

---

## Modo demo (crítico para hackathon)

- **Script de simulación** que carga series temporales históricas (reales o sintéticas) en Supabase.
- **Time Slider** en el frontend: mueve un cursor sobre la línea de tiempo y **reproduce** el estado del sistema en ese instante (potencia, temperaturas, alertas).
- Inyectar eventos disparadores: **arco eléctrico** (pico de corriente + caída abrupta de tensión), **degradación** (decremento lento de ratio PR), **breaker fatigado** (FP oscilante).
- Objetivo: demo corta (p. ej. ~90 s) que muestra detección sin depender de red ni hardware en sala.

---

## Stack (resumen)

**Supabase** = Auth, JWT, RLS, Postgres (cliente JS **2.70.x**). **FastAPI** = servicio aislado (cálculo + `POST /ingest` con clave máquina; rutas user-facing con **mismo JWT** que el JS). **React/Vite/TS + Tailwind**, paquetes con **npm**. **Tinku** = obtención de datos proveedor (guía en `docs/resources/technical_guide.md`); contrato API y seguridad del borde SolarPulse → `docs/API_SPEC.yml`.

Detalle de capas y flujo: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).
