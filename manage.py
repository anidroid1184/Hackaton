#!/usr/bin/env python3
"""Orquestación local: FastAPI (backend), Vite (frontend) y mock-hub.

Uso (desde la raíz del repo):
  uv run manage.py runserver                # FastAPI + Vite
  uv run manage.py runserver --simulate     # FastAPI + Vite + mock-hub
  uv run manage.py backend     # solo API :8000
  uv run manage.py frontend    # solo UI :5173

Supabase: arranca aparte con `supabase start` si necesitas Auth/DB local.
"""

from __future__ import annotations

import argparse
import json
import os
import socket
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent
BACKEND = ROOT / "backend"
FRONTEND = ROOT / "frontend"
MOCK_HUB = ROOT / "mock-hub"
DEFAULT_MOCK_HUB_PORT = 4010
DEBUG_LOG_PATH = ROOT / ".cursor" / "debug-58c209.log"
DEBUG_SESSION_ID = "58c209"
DEBUG_RUN_ID = "runserver-simulate-pre-fix"


# region agent log
def _debug_log(hypothesis_id: str, location: str, message: str, data: dict[str, object]) -> None:
    entry = {
        "sessionId": DEBUG_SESSION_ID,
        "runId": DEBUG_RUN_ID,
        "hypothesisId": hypothesis_id,
        "location": location,
        "message": message,
        "data": data,
        "timestamp": int(time.time() * 1000),
    }
    try:
        with DEBUG_LOG_PATH.open("a", encoding="utf-8") as fh:
            fh.write(json.dumps(entry, ensure_ascii=True) + "\n")
    except OSError:
        return


def _is_port_in_use(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.settimeout(0.25)
        return sock.connect_ex(("127.0.0.1", port)) == 0


# endregion


def run_backend() -> int:
    return subprocess.call(
        [
            "uv",
            "run",
            "uvicorn",
            "main:app",
            "--reload",
            "--host",
            "0.0.0.0",
            "--port",
            "8000",
        ],
        cwd=BACKEND,
    )


def run_frontend() -> int:
    return subprocess.call(["pnpm", "run", "dev"], cwd=FRONTEND)


def run_server(simulate: bool = False, mock_hub_port: int = DEFAULT_MOCK_HUB_PORT) -> int:
    frontend_env = dict(os.environ)
    processes: dict[str, subprocess.Popen[bytes]] = {}
    # region agent log
    _debug_log(
        "H1",
        "manage.py:run_server:entry",
        "run_server invoked",
        {
            "simulate": simulate,
            "mock_hub_port_arg": mock_hub_port,
            "env_mock_hub_port": os.environ.get("MOCK_HUB_PORT", ""),
            "port_in_use_before_spawn": _is_port_in_use(mock_hub_port),
        },
    )
    # endregion

    if simulate:
        frontend_env["VITE_STATS_BASE_URL"] = f"http://127.0.0.1:{mock_hub_port}"
        frontend_env["VITE_REPORTS_BASE_URL"] = "http://127.0.0.1:8000"
        print(
            "MiTechoRentable runserver --simulate:\n"
            "  backend :8000\n"
            "  frontend :5173 (VITE_REPORTS_BASE_URL -> backend, VITE_STATS_BASE_URL -> mock-hub)\n"
            f"  mock-hub :{mock_hub_port}\n"
            "  Ctrl+C detiene los 3 procesos.\n"
            "  Supabase local (opcional): supabase start\n",
            file=sys.stderr,
        )
    else:
        print(
            "MiTechoRentable runserver:\n"
            "  backend :8000\n"
            "  frontend :5173\n"
            "  Ctrl+C detiene ambos.\n"
            "  Supabase local (opcional): supabase start\n",
            file=sys.stderr,
        )

    processes["backend"] = subprocess.Popen(
        [
            "uv",
            "run",
            "uvicorn",
            "main:app",
            "--reload",
            "--host",
            "0.0.0.0",
            "--port",
            "8000",
        ],
        cwd=BACKEND,
    )
    processes["frontend"] = subprocess.Popen(["pnpm", "run", "dev"], cwd=FRONTEND, env=frontend_env)
    if simulate:
        mock_hub_env = dict(frontend_env)
        mock_hub_env["MOCK_HUB_PORT"] = str(mock_hub_port)
        # region agent log
        _debug_log(
            "H2",
            "manage.py:run_server:mock_hub_env",
            "mock-hub env prepared",
            {
                "mock_hub_port_env": mock_hub_env.get("MOCK_HUB_PORT", ""),
                "vite_stats_base_url": mock_hub_env.get("VITE_STATS_BASE_URL", ""),
                "vite_reports_base_url": mock_hub_env.get("VITE_REPORTS_BASE_URL", ""),
            },
        )
        # endregion
        processes["mock-hub"] = subprocess.Popen(["pnpm", "run", "mock-hub"], cwd=MOCK_HUB, env=mock_hub_env)
        # region agent log
        _debug_log(
            "H3",
            "manage.py:run_server:mock_hub_spawned",
            "mock-hub process spawned",
            {"pid": processes["mock-hub"].pid, "cwd": str(MOCK_HUB)},
        )
        # endregion

    try:
        while True:
            for name, process in processes.items():
                code = process.poll()
                if code is not None:
                    # region agent log
                    _debug_log(
                        "H4",
                        "manage.py:run_server:process_exit",
                        "child process exited",
                        {"name": name, "code": code},
                    )
                    # endregion
                    print(f"{name} terminó con código {code}.", file=sys.stderr)
                    return code
            time.sleep(0.3)
    except KeyboardInterrupt:
        print("\nDeteniendo procesos…", file=sys.stderr)
    finally:
        for process in processes.values():
            if process.poll() is None:
                process.terminate()
        for process in processes.values():
            try:
                process.wait(timeout=8)
            except subprocess.TimeoutExpired:
                process.kill()
    return 0


def main() -> None:
    parser = argparse.ArgumentParser(description="MiTechoRentable — arranque local")
    sub = parser.add_subparsers(dest="cmd", required=True)

    runserver_parser = sub.add_parser("runserver", help="FastAPI + Vite en paralelo")
    runserver_parser.add_argument(
        "--simulate",
        action="store_true",
        help="Incluye mock-hub; VITE_REPORTS_BASE_URL -> backend y VITE_STATS_BASE_URL -> simulación",
    )
    runserver_parser.add_argument(
        "--mock-hub-port",
        type=int,
        default=DEFAULT_MOCK_HUB_PORT,
        help=f"Puerto para mock-hub en modo --simulate (default: {DEFAULT_MOCK_HUB_PORT})",
    )
    sub.add_parser("backend", help="Solo FastAPI (puerto 8000)")
    sub.add_parser("frontend", help="Solo Vite (puerto 5173)")

    args = parser.parse_args()
    if args.cmd == "runserver":
        raise SystemExit(run_server(simulate=args.simulate, mock_hub_port=args.mock_hub_port))
    if args.cmd == "backend":
        raise SystemExit(run_backend())
    if args.cmd == "frontend":
        raise SystemExit(run_frontend())
    raise SystemExit(1)


if __name__ == "__main__":
    main()
