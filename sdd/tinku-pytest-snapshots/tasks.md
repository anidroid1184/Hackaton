# Tareas — tinku-pytest-snapshots (seguimiento SDD)

**Documentación canónica:** [`docs/DEVELOPMENT.md`](../../docs/DEVELOPMENT.md). Este checklist no sustituye a `docs/`.

- [x] Dependencias dev: pytest, pyyaml, python-dotenv; `[tool.pytest.ini_options]` en backend
- [x] Manifest `tinku_endpoints.yaml` + carpetas snapshots + README + gitignore JSON
- [x] `conftest.py`: dotenv raíz, `--tinku`, markers, fixture snapshots por sesión, deselect
- [x] Tests: `test_health`, `test_fetch_snapshots` (tinku), offline + soporte unitario
- [x] `docs/TINKU_MIDDLEWARE_API.yml` + enlaces en `API_SPEC.yml` y `ARCHITECTURE.md`
- [x] `.env.example` + `docs/DEVELOPMENT.md` como fuente de verdad operativa
