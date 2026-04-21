# Reportes PDF (Lote 5)

## Objetivo

Pipeline backend para generar/descargar reportes PDF en 4 combinaciones:

- Natural + Simplificado
- Natural + Técnico
- Jurídico-Corporativo + Simplificado
- Jurídico-Corporativo + Técnico

Se usan **2 plantillas LaTeX parametrizadas** en `backend/templates/reports/`:

- `simplified.tex`
- `technical.tex`

Ambas son **sin logo** para permitir reemplazo de branding por texto.

## Endpoint backend

- Método: `GET /reports/generate`
- Auth: `Authorization: Bearer <supabase_access_token>`
- Router: `backend/routers/reports.py`
- Motor de render/generación: `backend/domain/report_templates.py`

### Query params

| Parámetro | Tipo | Default | Descripción |
|---|---|---|---|
| `audience` | `natural \| corporativo` | `natural` | Define persona destino del reporte |
| `detail` | `simplificado \| tecnico` | `simplificado` | Selecciona plantilla base |
| `period` | `mensual \| trimestral \| anual` | `mensual` | Etiqueta de periodo |
| `output` | `pdf \| tex` | `pdf` | `pdf` descarga PDF; `tex` descarga fuente LaTeX |
| `company_name` | `string` | `MiTechoRentable` | Branding textual principal |
| `client_name` | `string` | `Cliente Solar` | Nombre del cliente en portada |
| `include_promise_vs_real` | `bool` | `true` | Marca si incluye comparativo |
| `include_validation_stamp` | `bool` | `true` | Marca si incluye sello técnico |

## Branding y reemplazo

Las plantillas incluyen placeholders para marca y textos:

- `{{COMPANY_NAME}}`
- `{{CLIENT_NAME}}`
- `{{BRANDING_NOTE}}`

No se embebe logo ni assets gráficos para evitar acoplamiento. El reemplazo de marca se hace por query params o por integración posterior con catálogo de branding.

## Pipeline de generación

1. API recibe parámetros.
2. Se arma `ReportRequest`.
3. Se renderiza LaTeX con la plantilla seleccionada.
4. Si existe `pdflatex`, compila PDF.
5. Si no existe compilador, entrega PDF fallback textual (mantiene contrato de descarga).

El fallback permite mantener demo/entornos livianos sin depender de TeXLive completo.
