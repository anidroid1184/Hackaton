"""Endpoint de generacion/descarga PDF para reportes cliente."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Annotated, Literal

from domain.report_templates import ReportRequest, build_filename, generate_pdf_bytes, render_latex
from fastapi import APIRouter, Depends, Query, Response
from jwt_auth import get_current_claims

router = APIRouter(tags=["reports"])

Audience = Literal["natural", "corporativo"]
DetailLevel = Literal["simplificado", "tecnico"]
Period = Literal["mensual", "trimestral", "anual"]
OutputKind = Literal["pdf", "tex"]


@router.get("/reports/generate")
def generate_report(
    claims: Annotated[dict, Depends(get_current_claims)],
    audience: Audience = Query(default="natural"),
    detail: DetailLevel = Query(default="simplificado"),
    period: Period = Query(default="mensual"),
    output: OutputKind = Query(default="pdf"),
    company_name: str = Query(default="MiTechoRentable"),
    client_name: str = Query(default="Cliente Solar"),
    include_promise_vs_real: bool = Query(default=True),
    include_validation_stamp: bool = Query(default=True),
) -> Response:
    del claims
    request = ReportRequest(
        audience=audience,
        detail=detail,
        period=period,
        company_name=company_name,
        client_name=client_name,
        generated_at=datetime.now(tz=UTC),
        include_promise_vs_real=include_promise_vs_real,
        include_validation_stamp=include_validation_stamp,
    )
    if output == "tex":
        filename = build_filename(request).replace(".pdf", ".tex")
        latex = render_latex(request)
        headers = {"Content-Disposition": f'attachment; filename="{filename}"'}
        return Response(content=latex, media_type="application/x-tex", headers=headers)

    payload = generate_pdf_bytes(request)
    filename = build_filename(request)
    headers = {"Content-Disposition": f'attachment; filename="{filename}"'}
    return Response(content=payload, media_type="application/pdf", headers=headers)
