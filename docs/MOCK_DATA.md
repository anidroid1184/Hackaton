# Datos mock — desarrollo en paralelo

## Regla: desarrollo en paralelo

El frontend (**Santiago**, **Isabel**) consume **mocks** definidos aquí y tipos derivados de OpenAPI hasta que el backend (**Sebastián**) conecte Supabase y los endpoints reales.

- Contrato: mismas formas que la API final (o delta mínimo documentado en `API_SPEC.md`).
- Transición: sustituir capa mock por `fetch` real sin reescribir componentes de presentación.

## JSON — `Usuarios`

```json
{}
```

## JSON — `EntidadPrincipal`

```json
{}
```
