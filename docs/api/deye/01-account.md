# 01 · Cuenta (`account`)

Endpoints de información de la cuenta. Útiles para validar credenciales y obtener el `companyId`.

---

## `POST /v1.0/account/info`

Devuelve información básica de la cuenta asociada a tu key, incluyendo la organización (empresa) y el rol.

### Request

**Método:** `POST`
**Ruta:** `/v1.0/account/info`
**Body:** objeto vacío.

```json
{}
```

### Ejemplo con `curl`

```bash
curl -X POST "https://techos.thetribu.dev/deye/v1.0/account/info" \
  -H "Authorization: $TEAM_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

### Respuesta (mock)

```json
{
  "code": "1000000",
  "msg": "success",
  "success": true,
  "requestId": "a8e021dd583a8b69",
  "orgInfoList": [
    {
      "companyId": 10386610,
      "companyName": "Empresa Ejemplo S.A.S",
      "roleName": "Administrador"
    }
  ]
}
```

### Campos de la respuesta

| Campo | Tipo | Descripción |
|---|---|---|
| `orgInfoList` | array | Lista de organizaciones a las que tiene acceso la cuenta. Normalmente una sola. |
| `orgInfoList[].companyId` | number | ID de la empresa. **Guárdalo**: algunos endpoints internos lo usan como referencia. |
| `orgInfoList[].companyName` | string | Nombre comercial de la empresa. |
| `orgInfoList[].roleName` | string | Rol del usuario dentro de la empresa (por ejemplo `Administrador`, `Operador`, etc.). |

### Uso típico

- Llamar una sola vez al inicio de la sesión para validar que la API key funciona y cachear `companyId`.
- Si la respuesta es `401`, revisa el header `Authorization`.
- Si `success == true`, ya puedes llamar `/v1.0/station/list` para descubrir las plantas.
