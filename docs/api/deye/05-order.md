# 05 · Órdenes (`order`)

Endpoint para consultar el resultado de una **orden** (comando enviado a un dispositivo). Solo lectura en esta guía — los endpoints de creación de órdenes (`/v1.0/order/*Control`, `/order/*/update`, etc.) son de escritura y no están habilitados para los equipos.

---

## 1. `GET /v1.0/order/{orderId}`

Consulta el estado y resultado de una orden específica por su `orderId`.

### Request

**Método:** `GET`
**Ruta:** `/v1.0/order/{orderId}`

> Este es el **único endpoint `GET`** de toda la API de Deye expuesta aquí. No requiere body.

### Ejemplo

```bash
ORDER_ID="123456789"

curl -X GET "$BASE/v1.0/order/$ORDER_ID" \
  -H "Authorization: $TEAM_KEY"
```

### Respuesta (mock, orden válida)

```json
{
  "code": "1000000", "success": true, "requestId": "9a1f8b2c3d4e5f60",
  "orderId": "123456789",
  "deviceSn": "2402010117",
  "orderType": "SET_WORK_MODE",
  "status": "SUCCESS",
  "createTime": 1776400000,
  "finishTime": 1776400030,
  "params": { "workMode": "BATTERY_FIRST" },
  "result": "ok"
}
```

### Respuesta (mock, orderId inválido)

```json
{
  "code": "2101043",
  "msg": "orderid is wrong",
  "success": false,
  "requestId": "62c6b456c2f3401f"
}
```

### Campos

| Campo | Descripción |
|---|---|
| `orderId` | Identificador de la orden que consultaste. |
| `deviceSn` | Dispositivo objetivo de la orden. |
| `orderType` | Tipo de orden (por ejemplo `SET_WORK_MODE`, `SET_BATTERY_PARAM`, `CUSTOM_CONTROL`, etc.). |
| `status` | `PENDING`, `EXECUTING`, `SUCCESS`, `FAILED`, `TIMEOUT`. |
| `createTime` | Cuándo se creó la orden (segundos epoch). |
| `finishTime` | Cuándo terminó (segundos epoch). Puede estar vacío si aún no finaliza. |
| `params` | Parámetros con los que se envió la orden (depende del `orderType`). |
| `result` | Resultado/diagnóstico detallado (campo libre). |

### Códigos de respuesta específicos

| `code` | Significado |
|---|---|
| `1000000` | La orden existe y se devolvió su información. |
| `2101043` | `orderid is wrong` — el `orderId` no existe o no pertenece a tu cuenta. |

> **Nota para los equipos:** como la creación de órdenes no está habilitada, este endpoint sirve principalmente para probar el flujo de error (`2101043`). Si algún día obtienes un `orderId` (por ejemplo a través de soporte o una orden disparada desde la consola de Deye), podrás consultar aquí su estado.
