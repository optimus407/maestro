import os
from contextlib import contextmanager
from decimal import Decimal

from fastapi import FastAPI, Form, Request, status
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from passlib.context import CryptContext
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool
from starlette.middleware.sessions import SessionMiddleware

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/maestro")
SECRET_KEY = os.getenv("SECRET_KEY", "cambiar-esto-en-produccion")

pool = ConnectionPool(conninfo=DATABASE_URL, kwargs={"row_factory": dict_row}, open=False)

app = FastAPI(title="Consulta Financiera - Institución Educativa")
app.add_middleware(SessionMiddleware, secret_key=SECRET_KEY, max_age=60 * 30)
app.mount("/static", StaticFiles(directory="app/static"), name="static")
templates = Jinja2Templates(directory="app/templates")


@app.on_event("startup")
def startup_event():
    pool.open(wait=False)


@app.on_event("shutdown")
def shutdown_event():
    pool.close()


@contextmanager
def get_conn():
    with pool.connection() as conn:
        yield conn


def validar_acceso(usuario: str, clave: str):
    query = """
        SELECT
            aa.id,
            aa.usuario,
            aa.password_hash,
            aa.alumno_id,
            a.codigo_alumno,
            a.nombres,
            a.apellidos,
            a.grado,
            a.seccion
        FROM apoderado_acceso aa
        INNER JOIN alumnos a ON a.id = aa.alumno_id
        WHERE aa.usuario = %(usuario)s
          AND aa.activo = true
        LIMIT 1;
    """
    with get_conn() as conn:
        row = conn.execute(query, {"usuario": usuario}).fetchone()

    if not row:
        return None

    if not pwd_context.verify(clave, row["password_hash"]):
        return None

    return row


def obtener_estado_financiero(alumno_id: int):
    query = """
        SELECT
            concepto,
            periodo,
            fecha_vencimiento,
            monto,
            monto_pagado,
            (monto - monto_pagado) AS saldo,
            CASE WHEN monto_pagado >= monto THEN 'PAGADO' ELSE 'PENDIENTE' END AS estado
        FROM estado_financiero_alumno
        WHERE alumno_id = %(alumno_id)s
        ORDER BY periodo DESC, fecha_vencimiento DESC;
    """
    with get_conn() as conn:
        return conn.execute(query, {"alumno_id": alumno_id}).fetchall()


@app.get("/", response_class=HTMLResponse)
def home(request: Request):
    if request.session.get("alumno_id"):
        return RedirectResponse("/estado", status_code=status.HTTP_302_FOUND)
    return templates.TemplateResponse("login.html", {"request": request, "error": None})


@app.post("/login", response_class=HTMLResponse)
def login(request: Request, usuario: str = Form(...), clave: str = Form(...)):
    acceso = validar_acceso(usuario.strip(), clave)
    if not acceso:
        return templates.TemplateResponse(
            "login.html",
            {"request": request, "error": "Usuario o contraseña inválidos."},
            status_code=status.HTTP_401_UNAUTHORIZED,
        )

    request.session["alumno_id"] = acceso["alumno_id"]
    request.session["alumno_nombre"] = f"{acceso['apellidos']}, {acceso['nombres']}"
    request.session["codigo_alumno"] = acceso["codigo_alumno"]
    request.session["grado"] = acceso["grado"]
    request.session["seccion"] = acceso["seccion"]
    return RedirectResponse("/estado", status_code=status.HTTP_302_FOUND)


@app.get("/estado", response_class=HTMLResponse)
def estado(request: Request):
    alumno_id = request.session.get("alumno_id")
    if not alumno_id:
        return RedirectResponse("/", status_code=status.HTTP_302_FOUND)

    deudas = obtener_estado_financiero(alumno_id)
    total_pendiente = sum((item["saldo"] or Decimal("0")) for item in deudas)

    return templates.TemplateResponse(
        "estado.html",
        {
            "request": request,
            "alumno": {
                "nombre": request.session.get("alumno_nombre"),
                "codigo": request.session.get("codigo_alumno"),
                "grado": request.session.get("grado"),
                "seccion": request.session.get("seccion"),
            },
            "deudas": deudas,
            "total_pendiente": total_pendiente,
        },
    )


@app.post("/logout")
def logout(request: Request):
    request.session.clear()
    return RedirectResponse("/", status_code=status.HTTP_302_FOUND)
