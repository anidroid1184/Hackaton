# Arquitectura — Rootwave

## Patrón

**Monolito modular:** una base de código desplegable como unidad, con módulos internos con límites claros (API, dominio, persistencia). Sin microservicios en el MVP de hackathon; la modularidad reduce acoplamiento y facilita tests y evolución.

## Stack

| Capa | Tecnología |
|------|------------|
| Backend | FastAPI (Python) |
| Frontend | React + TypeScript (Vite) |
| Datos | Supabase (Postgres + auth + RLS) |
| Contenedores | Docker (solo despliegue del backend) |

## Backend: tres capas (desacoplamiento estricto)

1. **Communication / Routers** — HTTP, esquemas de entrada/salida, status codes. Sin SQL ni reglas de negocio.
2. **Domain / Logic** — Casos de uso, validaciones de negocio, orquestación. Sin detalles de transporte ni drivers de DB.
3. **Database / Supabase** — Cliente Supabase, consultas, mapeo fila↔modelo. Sin lógica de negocio.

**Regla:** dependencias solo hacia adentro: Routers → Domain → Database. Ninguna capa salta otra.

## Frontend

SPA contra API REST del backend; tipos alineados con OpenAPI cuando exista spec.
