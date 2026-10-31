# RailScope EU

Plataforma de telemetría y visualización en tiempo real del tráfico ferroviario europeo. Emplea un backend asíncrono y una arquitectura de recolección distribuida para escanear, almacenar y representar miles de trenes simultáneamente utilizando las APIs de HAFAS.

## Arquitectura del Sistema
* **Ingesta de Datos:** Worker en Python (`pyhafas`) con escaneo geográfico en cuadrícula (Bounding Boxes) concurrente (SBB, DB, ÖBB).
* **Backend & API:** FastAPI con WebSockets nativos (`ConnectionManager`) para retransmisión de latencia ultrabaja.
* **Persistencia Temporal:** PostgreSQL + TimescaleDB (Hypertable particionada, índices compuestos y downsampling automatizado).
* **Frontend Visual:** React, Vite y Leaflet con clústeres dinámicos (`react-leaflet-cluster`), diseñado para hospedaje estático con CSP estricto.
* **Observabilidad:** Stack integrado de Grafana, Loki y Promtail para centralización de logs y métricas de rendimiento.

## Requisitos Previos
* Docker Engine y Docker Compose (versión 3.8+).
* Node.js 18+ (para desarrollo y compilación del frontend).
* Entorno local o servidor Linux con puertos internos 8000, 3100, 3000 y 5432 libres.

## Guía de Usuario y Despliegue

**1. Preparación del Entorno**
Clona el repositorio e inicializa las credenciales seguras. El archivo `.env` está ignorado en Git por seguridad.
```bash
git clone [https://github.com/tu-usuario/railscope.git](https://github.com/tu-usuario/railscope.git)
cd railscope
cp .env.example .env
nano .env # Define POSTGRES_PASSWORD, POSTGRES_USER y FRONTEND_URL