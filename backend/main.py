import os
import sys
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Any, List, Optional

import asyncpg
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger
from pydantic import BaseModel, Field, model_validator

# ==============================================================================
# 1. Configuración de Logging con Loguru
# ==============================================================================
LOG_DIR = os.getenv("LOG_DIR", "/app/logs")
os.makedirs(LOG_DIR, exist_ok=True)

logger.remove()
logger.add(
    sys.stdout,
    colorize=True,
    format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
    level="INFO",
)
logger.add(
    os.path.join(LOG_DIR, "backend.log"),
    rotation="10 MB",
    retention="7 days",
    compression="zip",
    level="INFO",
)

# ==============================================================================
# 2. Configuración de Entorno & CORS Estricto
# ==============================================================================
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgres://rail_admin:secure_rail_pass@timescaledb:5432/railscope",
)
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

# Parsear orígenes permitidos separados por comas
allowed_origins = [origin.strip() for origin in FRONTEND_URL.split(",") if origin.strip()]
logger.info(f"Configurando CORS estricto para los orígenes: {allowed_origins}")

# ==============================================================================
# 3. Gestor de Conexiones WebSocket (ConnectionManager)
# ==============================================================================
class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"Nuevo cliente WebSocket conectado. Total activos: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"Cliente WebSocket desconectado. Total activos: {len(self.active_connections)}")

    async def broadcast(self, message: Any):
        if not self.active_connections:
            return
        
        # Enviar en paralelo a todos los clientes activos
        dead_connections = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.warning(f"Error al enviar mensaje a cliente WebSocket: {e}")
                dead_connections.append(connection)

        for dead_conn in dead_connections:
            self.disconnect(dead_conn)

manager = ConnectionManager()

# ==============================================================================
# 4. Modelos Pydantic de Telemetría
# ==============================================================================
class TelemetryPoint(BaseModel):
    train_id: str = Field(..., max_length=50, description="Identificador único del tren")
    operator: str = Field(..., max_length=50, description="Operador ferroviario (p.ej. Renfe, SBB, DB, Shinkansen)")
    country: str = Field(..., min_length=2, max_length=10, description="Código ISO de país o región (p.ej. ES, DE, JP, CN, FR/DE)")
    lat: float = Field(..., ge=-90.0, le=90.0, description="Latitud GPS")
    lon: float = Field(..., ge=-180.0, le=180.0, description="Longitud GPS")
    is_realtime: bool = Field(default=True, description="Indicador de posición satelital en tiempo real")
    last_station_name: Optional[str] = Field(default=None, max_length=100, description="Última estación registrada")
    speed: Optional[float] = Field(default=None, ge=0.0, description="Velocidad actual en km/h")
    time: Optional[datetime] = Field(default=None, description="Marca de tiempo de la coordenada")
    timestamp: Optional[datetime] = Field(default=None, description="Alias alternativo para time")

    @model_validator(mode="before")
    @classmethod
    def reconcile_time(cls, data: Any) -> Any:
        if isinstance(data, dict):
            # Aceptar tanto 'time' como 'timestamp' proveniente de diferentes emisores
            selected_time = data.get("time") or data.get("timestamp")
            if not selected_time:
                selected_time = datetime.now(timezone.utc)
            data["time"] = selected_time
        return data

# ==============================================================================
# 5. Ciclo de Vida de FastAPI & Pool de Conexiones asyncpg
# ==============================================================================
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Inicializando pool de conexiones asíncronas con TimescaleDB...")
    try:
        app.state.pool = await asyncpg.create_pool(
            dsn=DATABASE_URL,
            min_size=5,
            max_size=20,
            command_timeout=60,
        )
        logger.info("Pool de TimescaleDB inicializado correctamente.")
    except Exception as exc:
        logger.error(f"Fallo crítico al conectar con TimescaleDB: {exc}")
        raise exc

    yield

    logger.info("Cerrando pool de conexiones TimescaleDB...")
    await app.state.pool.close()
    logger.info("Pool cerrado exitosamente.")

app = FastAPI(
    title="RailScope Telemetry API",
    description="Motor de alta concurrencia para telemetría ferroviaria en tiempo real",
    version="1.0.0",
    lifespan=lifespan,
)

# Configuración de CORS estricto
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# ==============================================================================
# 6. Endpoints de la API
# ==============================================================================

@app.get("/healthz", tags=["Health"])
async def health_check():
    """Comprobación de salud para Docker / Kubernetes orchestrators."""
    try:
        async with app.state.pool.acquire() as conn:
            await conn.execute("SELECT 1;")
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        logger.error(f"Health check fallido: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database connection unavailable",
        )

@app.websocket("/ws/telemetry")
async def websocket_telemetry_endpoint(websocket: WebSocket):
    """Canal WebSocket para recibir actualizaciones de telemetría en tiempo real."""
    await manager.connect(websocket)
    try:
        while True:
            # Mantener conexión activa escuchando posibles pings del cliente
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"Excepción en WebSocket: {e}")
        manager.disconnect(websocket)

@app.post("/api/telemetry/batch", status_code=status.HTTP_201_CREATED, tags=["Telemetry"])
async def ingest_telemetry_batch(batch: List[TelemetryPoint]):
    """
    Ingesta masiva de telemetría:
    1. Inserta las coordenadas en TimescaleDB en una sola llamada usando asyncpg.executemany.
    2. Emite el lote de inmediato vía WebSocket a todos los frontends conectados.
    """
    if not batch:
        return {"status": "ignored", "message": "Batch vacío"}

    records = [
        (
            item.time,
            item.train_id,
            item.operator,
            item.country,
            item.lat,
            item.lon,
            item.is_realtime,
            item.last_station_name,
            item.speed,
        )
        for item in batch
    ]

    insert_sql = """
        INSERT INTO train_telemetry (
            time, train_id, operator, country, lat, lon, is_realtime, last_station_name, speed
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);
    """

    try:
        async with app.state.pool.acquire() as conn:
            await conn.executemany(insert_sql, records)

        logger.info(f"Lote insertado exitosamente: {len(records)} registros.")
    except Exception as e:
        logger.error(f"Error durante asyncpg.executemany: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Fallo al persistir lote de telemetría: {str(e)}",
        )

    # Difusión en tiempo real hacia WebSocket clients
    payload_ws = [item.model_dump(mode="json") for item in batch]
    await manager.broadcast(payload_ws)

    return {
        "status": "success",
        "inserted": len(records),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

@app.get("/api/telemetry/latest", tags=["Telemetry"])
async def get_latest_telemetry():
    """
    Devuelve la última posición conocida de cada tren utilizando la cláusula
    SQL DISTINCT ON (train_id) sobre la Hypertable de TimescaleDB.
    """
    query = """
        SELECT DISTINCT ON (train_id)
            time,
            train_id,
            operator,
            country,
            lat,
            lon,
            is_realtime,
            last_station_name,
            speed
        FROM train_telemetry
        ORDER BY train_id, time DESC;
    """

    try:
        async with app.state.pool.acquire() as conn:
            rows = await conn.fetch(query)

        # Mapear registros asyncpg a diccionarios JSON-serializables
        latest_positions = [dict(row) for row in rows]
        return latest_positions
    except Exception as e:
        logger.error(f"Error al consultar la última telemetría: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al recuperar la última posición de los trenes.",
        )

