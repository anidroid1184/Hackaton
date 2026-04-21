# Snapshots JSON (middleware Tinku)

Los archivos `*.json` bajo `deye/`, `huawei/` y `growatt/` se generan al ejecutar `pytest --tinku` (ver **`docs/DEVELOPMENT.md`** en la raíz del repo: entorno, `.env.example`, comandos).

Están en `.gitignore` del monorepo porque pueden contener datos operativos. Versionar el manifest `../tinku_endpoints.yaml` y el OpenAPI `docs/TINKU_MIDDLEWARE_API.yml` (sincronizados).
