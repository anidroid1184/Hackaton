# Especificación API (REST)

Formato de referencia por endpoint. Sustituir rutas y payloads con los definitivos.

## Ejemplo (YAML)

```yaml
endpoints:
  - method: POST
    path: /api/v1/auth/login
    description: Autenticación por credenciales; devuelve tokens de sesión.
    payload:
      request:
        content_type: application/json
        body:
          email: string
          password: string
    response:
      success:
        status: 200
        body:
          access_token: string
          token_type: bearer
      error:
        status: 401
        body:
          detail: string
```

## Ejemplo equivalente (JSON)

```json
{
  "endpoints": [
    {
      "method": "GET",
      "path": "/api/v1/health",
      "description": "Comprobación de disponibilidad del servicio.",
      "payload": {
        "request": null
      },
      "response": {
        "success": {
          "status": 200,
          "body": { "status": "ok" }
        },
        "error": {
          "status": 503,
          "body": { "detail": "unavailable" }
        }
      }
    }
  ]
}
```
