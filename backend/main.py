"""MiTechoRentable — Intelligence Core (FastAPI).

Mínimo indispensable. Lo que Supabase resuelve con tabla+RLS+RPC no vive aquí.
Aquí vive: inferencia de magnitud, KPIs derivados, PDFs, WS de alertas.
"""

from __future__ import annotations

from typing import Annotated

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from jwt_auth import get_current_claims, me_payload
from routers.ingest import router as ingest_router
from routers.mvp import router as mvp_router
from routers.reports import router as reports_router
from routers.stats import router as stats_router

app = FastAPI(
    title="MiTechoRentable API",
    version="0.1.0",
    description="Intelligence core. Supabase = fuente de verdad.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^http://(localhost|127\.0\.0\.1):(5173|5174|5175|5176|5177|5178|5179)$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ingest_router)
app.include_router(stats_router)
app.include_router(mvp_router)
app.include_router(reports_router)


@app.get("/health", tags=["health"])
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/me", tags=["auth"])
def me(claims: Annotated[dict, Depends(get_current_claims)]) -> dict[str, str | None]:
    return me_payload(claims)


def main() -> None:
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)  # noqa: S104


if __name__ == "__main__":
    main()
