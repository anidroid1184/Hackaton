"""Render y generación PDF de reportes cliente/corporativo."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from shutil import which
import subprocess
from tempfile import TemporaryDirectory

TEMPLATES_DIR = Path(__file__).resolve().parents[1] / "templates" / "reports"


@dataclass(frozen=True)
class ReportRequest:
    audience: str
    detail: str
    period: str
    company_name: str
    client_name: str
    generated_at: datetime
    include_promise_vs_real: bool
    include_validation_stamp: bool


def build_filename(request: ReportRequest) -> str:
    return (
        f"reporte-{request.audience}-{request.detail}-{request.period}-"
        f"{request.generated_at.astimezone(UTC).strftime('%Y%m%d')}.pdf"
    )


def render_latex(request: ReportRequest) -> str:
    template_name = "technical.tex" if request.detail == "tecnico" else "simplified.tex"
    template = (TEMPLATES_DIR / template_name).read_text(encoding="utf-8")
    audience_label = "Cliente natural" if request.audience == "natural" else "Cliente juridico-corporativo"
    scope_label = "Resumen ejecutivo" if request.detail == "simplificado" else "Anexo tecnico"
    promise_vs_real_label = "Incluido" if request.include_promise_vs_real else "No incluido"
    validation_stamp_label = "Incluido" if request.include_validation_stamp else "No incluido"
    replacements = {
        "{{COMPANY_NAME}}": _escape_latex(request.company_name),
        "{{CLIENT_NAME}}": _escape_latex(request.client_name),
        "{{AUDIENCE_LABEL}}": _escape_latex(audience_label),
        "{{SCOPE_LABEL}}": _escape_latex(scope_label),
        "{{PERIOD_LABEL}}": _escape_latex(request.period),
        "{{GENERATED_AT}}": _escape_latex(request.generated_at.astimezone(UTC).strftime("%Y-%m-%d %H:%M UTC")),
        "{{PROMISE_VS_REAL}}": _escape_latex(promise_vs_real_label),
        "{{VALIDATION_STAMP}}": _escape_latex(validation_stamp_label),
        "{{BRANDING_NOTE}}": _escape_latex(
            "Plantilla sin logo. Reemplaza el encabezado textual por tu marca antes de produccion."
        ),
    }
    rendered = template
    for key, value in replacements.items():
        rendered = rendered.replace(key, value)
    return rendered


def generate_pdf_bytes(request: ReportRequest) -> bytes:
    latex_source = render_latex(request)
    binary = which("pdflatex")
    if not binary:
        return _build_fallback_pdf(request)
    compiled = _compile_latex(binary, latex_source)
    if compiled is None:
        return _build_fallback_pdf(request)
    return compiled


def _escape_latex(value: str) -> str:
    escaped = value
    for old, new in [
        ("\\", r"\textbackslash{}"),
        ("&", r"\&"),
        ("%", r"\%"),
        ("$", r"\$"),
        ("#", r"\#"),
        ("_", r"\_"),
        ("{", r"\{"),
        ("}", r"\}"),
        ("~", r"\textasciitilde{}"),
        ("^", r"\textasciicircum{}"),
    ]:
        escaped = escaped.replace(old, new)
    return escaped


def _compile_latex(binary: str, latex_source: str) -> bytes | None:
    try:
        with TemporaryDirectory(prefix="solarpulse-report-") as tmp:
            tmp_dir = Path(tmp)
            tex_path = tmp_dir / "report.tex"
            pdf_path = tmp_dir / "report.pdf"
            tex_path.write_text(latex_source, encoding="utf-8")
            command = [binary, "-interaction=nonstopmode", "-halt-on-error", tex_path.name]
            result = subprocess.run(
                command,
                cwd=tmp_dir,
                check=False,
                capture_output=True,
                text=True,
                timeout=20,
            )
            if result.returncode != 0 or not pdf_path.exists():
                return None
            return pdf_path.read_bytes()
    except (OSError, subprocess.SubprocessError):
        return None


# Paleta de marca MiTechoRentable ("Captured Light") en RGB 0..1 para operadores PDF.
_SOLAR = (0.961, 0.706, 0.000)  # #f5b400
_SOLAR_DEEP = (0.482, 0.349, 0.000)  # #7b5900
_GREEN = (0.082, 0.478, 0.322)  # #157a52
_INK = (0.102, 0.110, 0.110)  # #1a1c1c
_MUTED = (0.314, 0.271, 0.200)  # #504533
_SURFACE = (0.980, 0.969, 0.941)  # #faf7f0


def _build_fallback_pdf(request: ReportRequest) -> bytes:
    audience_label = "Cliente natural" if request.audience == "natural" else "Cliente juridico-corporativo"
    detail_label = "Reporte simplificado" if request.detail == "simplificado" else "Reporte tecnico"
    scope_label = "Resumen ejecutivo" if request.detail == "simplificado" else "Anexo tecnico"
    generated_at = request.generated_at.astimezone(UTC).strftime("%Y-%m-%d %H:%M UTC")
    promise = "Incluido" if request.include_promise_vs_real else "No incluido"
    stamp = "Incluido" if request.include_validation_stamp else "No incluido"

    rows: list[tuple[str, str]] = [
        ("Cliente", request.client_name),
        ("Audiencia", audience_label),
        ("Cobertura", scope_label),
        ("Periodo", request.period.capitalize()),
        ("Generado", generated_at),
        ("Promesa vs Real", promise),
        ("Sello de validacion tecnica", stamp),
    ]

    if request.detail == "tecnico":
        notes_title = "Variables sugeridas"
        notes = [
            "Energia acumulada (kWh) y rendimiento contractual",
            "KPI electricos: Voltaje, Corriente, Frecuencia, Factor de potencia",
            "Alertas priorizadas para mantenimiento preventivo",
        ]
    else:
        notes_title = "Resumen"
        notes = [
            "Documento simplificado para revision ejecutiva y financiera.",
            "Comparativo promesa vs real y sello tecnico segun flags del reporte.",
            "Plantilla base sin logo; branding reemplazable por nombre comercial.",
        ]

    return _render_branded_pdf(
        company=request.company_name,
        title=detail_label,
        subtitle=f"{audience_label} \xb7 {request.period.capitalize()}",
        rows=rows,
        notes_title=notes_title,
        notes=notes,
        footer_text="MiTechoRentable - fallback textual (sin pdflatex). Plantilla minima con branding de marca.",
    )


def _render_branded_pdf(
    *,
    company: str,
    title: str,
    subtitle: str,
    rows: list[tuple[str, str]],
    notes_title: str,
    notes: list[str],
    footer_text: str,
) -> bytes:
    ops: list[str] = []

    # Fondo surface (crema cálido de la marca).
    ops.append(_rgb_fill(_SURFACE))
    ops.append("0 0 612 792 re f")

    # Franja superior solar + acento verde.
    ops.append(_rgb_fill(_SOLAR))
    ops.append("0 720 612 72 re f")
    ops.append(_rgb_fill(_GREEN))
    ops.append("0 716 612 2 re f")

    # Wordmark en el header.
    ops.extend(_text(_SOLAR_DEEP, "F2", 24, 60, 752, "MiTechoRentable"))
    if company and company.strip() and company != "MiTechoRentable":
        ops.extend(_text(_SOLAR_DEEP, "F1", 11, 60, 732, company))

    # Título + subtítulo.
    ops.extend(_text(_INK, "F2", 20, 60, 680, title))
    ops.extend(_text(_MUTED, "F1", 11, 60, 662, subtitle))

    # Tabla clave/valor.
    label_col_x = 60
    value_col_x = 240
    row_height = 22
    y = 624
    for label, value in rows:
        ops.extend(_text(_MUTED, "F2", 10, label_col_x, y, label))
        ops.extend(_text(_INK, "F1", 11, value_col_x, y, value))
        y -= row_height

    # Divisor verde tenue.
    y -= 6
    ops.append(_rgb_fill(_GREEN))
    ops.append(f"60 {y} 492 1 re f")

    # Sección de notas.
    y -= 26
    ops.extend(_text(_SOLAR_DEEP, "F2", 13, 60, y, notes_title))
    y -= 20
    for note in notes:
        ops.extend(_text(_INK, "F1", 10, 60, y, f"\xb7  {note}"))
        y -= 16

    # Footer.
    ops.append(_rgb_fill(_SOLAR))
    ops.append("0 0 612 26 re f")
    ops.extend(_text(_SOLAR_DEEP, "F1", 8, 60, 10, footer_text))

    stream = "\n".join(ops).encode("latin-1", errors="replace")

    font_helvetica = b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>"
    font_helvetica_bold = (
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>"
    )
    objects: list[bytes] = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        (
            b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
            b"/Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>"
        ),
        font_helvetica,
        font_helvetica_bold,
        b"<< /Length " + str(len(stream)).encode("ascii") + b" >>\nstream\n" + stream + b"\nendstream",
    ]

    out = bytearray(b"%PDF-1.4\n")
    offsets = [0]
    for index, body in enumerate(objects, start=1):
        offsets.append(len(out))
        out.extend(f"{index} 0 obj\n".encode("ascii"))
        out.extend(body)
        out.extend(b"\nendobj\n")

    xref_start = len(out)
    out.extend(f"xref\n0 {len(objects) + 1}\n".encode("ascii"))
    out.extend(b"0000000000 65535 f \n")
    for offset in offsets[1:]:
        out.extend(f"{offset:010d} 00000 n \n".encode("ascii"))
    out.extend(
        f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref_start}\n%%EOF\n".encode("ascii")
    )
    return bytes(out)


def _rgb_fill(color: tuple[float, float, float]) -> str:
    r, g, b = color
    return f"{r:.3f} {g:.3f} {b:.3f} rg"


def _text(color: tuple[float, float, float], font: str, size: int, x: int, y: int, value: str) -> list[str]:
    # Tm (text matrix) fija posición absoluta y evita el bug acumulativo de Td al emitir varias líneas.
    return [
        "BT",
        _rgb_fill(color),
        f"/{font} {size} Tf",
        f"1 0 0 1 {x} {y} Tm",
        f"({_escape_pdf_text(value)}) Tj",
        "ET",
    ]


def _escape_pdf_text(value: str) -> str:
    return value.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
