# Sistema web de consulta financiera para padres de familia

Aplicación base en **FastAPI + PostgreSQL** para que los padres consulten el estado financiero de su hijo con usuario y contraseña.

## Requisitos

- Python 3.11+
- PostgreSQL 18 (o compatible)

## Configuración

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
export DATABASE_URL='postgresql://usuario:clave@host:5432/bd'
export SECRET_KEY='una-clave-segura'
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Estructura de datos esperada

La app espera estas estructuras mínimas:

- `apoderado_acceso(usuario, password_hash, alumno_id, activo)`
- `alumnos(id, codigo_alumno, nombres, apellidos, grado, seccion)`
- `estado_financiero_alumno(alumno_id, concepto, periodo, fecha_vencimiento, monto, monto_pagado)`

> `password_hash` debe estar en formato bcrypt.

## Flujo

1. Padre ingresa usuario + contraseña.
2. El sistema valida credenciales y crea sesión.
3. Se muestra el estado financiero del alumno, con total pendiente.
