import asyncio
import os
import sys
from datetime import datetime, timezone
from typing import Any, Dict, List, Tuple

import aiohttp
from loguru import logger
from pyhafas import HafasClient
from pyhafas.profile import DBProfile, OEBBProfile, SBBProfile

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
    os.path.join(LOG_DIR, "worker.log"),
    rotation="10 MB",
    retention="7 days",
    compression="zip",
    level="INFO",
)

# ==============================================================================
# 2. Configuración de Entorno & Clientes Ferroviarios
# ==============================================================================
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000/api/telemetry/batch")
MAX_CONCURRENT_REQUESTS = int(os.getenv("MAX_CONCURRENT_REQUESTS", "2"))
SCAN_INTERVAL_SECONDS = int(os.getenv("SCAN_INTERVAL_SECONDS", "30"))

logger.info(f"Destino de ingesta Backend: {BACKEND_URL}")
logger.info(f"Semáforo de concurrencia: max {MAX_CONCURRENT_REQUESTS} peticiones simultáneas")
logger.info(f"Intervalo entre ciclos de escaneo: {SCAN_INTERVAL_SECONDS}s")

# Instanciación de clientes HAFAS por operador
hafas_clients = {
    "SBB": HafasClient(SBBProfile()),
    "DB": HafasClient(DBProfile()),
    "OEBB": HafasClient(OEBBProfile()),
}

# ==============================================================================
# 3. Cuadrícula Geográfica (Bounding Boxes: North, West, South, East)
# ==============================================================================
# Se definen cuadrantes para los principales corredores ferroviarios
GRID_ZONES: List[Dict[str, Any]] = [
    # Suiza (SBB)
    {
        "id": "CH_ZURICH",
        "operator": "SBB",
        "country": "CH",
        "client": hafas_clients["SBB"],
        "bbox": (47.50, 8.40, 47.30, 8.70),
    },
    {
        "id": "CH_BASEL",
        "operator": "SBB",
        "country": "CH",
        "client": hafas_clients["SBB"],
        "bbox": (47.65, 7.50, 47.50, 7.70),
    },
    {
        "id": "CH_LEMAN",
        "operator": "SBB",
        "country": "CH",
        "client": hafas_clients["SBB"],
        "bbox": (46.60, 6.00, 46.15, 6.70),
    },
    {
        "id": "CH_BERN",
        "operator": "SBB",
        "country": "CH",
        "client": hafas_clients["SBB"],
        "bbox": (47.05, 7.35, 46.85, 7.55),
    },
    # Alemania (DB)
    {
        "id": "DE_MUNICH",
        "operator": "DB",
        "country": "DE",
        "client": hafas_clients["DB"],
        "bbox": (48.25, 11.45, 48.05, 11.75),
    },
    {
        "id": "DE_FRANKFURT",
        "operator": "DB",
        "country": "DE",
        "client": hafas_clients["DB"],
        "bbox": (50.20, 8.50, 49.95, 8.80),
    },
    {
        "id": "DE_BERLIN",
        "operator": "DB",
        "country": "DE",
        "client": hafas_clients["DB"],
        "bbox": (52.60, 13.25, 52.40, 13.55),
    },
    {
        "id": "DE_COLOGNE",
        "operator": "DB",
        "country": "DE",
        "client": hafas_clients["DB"],
        "bbox": (51.05, 6.85, 50.85, 7.15),
    },
    {
        "id": "DE_HAMBURG",
        "operator": "DB",
        "country": "DE",
        "client": hafas_clients["DB"],
        "bbox": (53.65, 9.90, 53.45, 10.15),
    },
    {
        "id": "DE_STUTTGART",
        "operator": "DB",
        "country": "DE",
        "client": hafas_clients["DB"],
        "bbox": (48.85, 9.10, 48.70, 9.30),
    },
    {
        "id": "DE_NUREMBERG",
        "operator": "DB",
        "country": "DE",
        "client": hafas_clients["DB"],
        "bbox": (49.50, 11.00, 49.40, 11.15),
    },
    # Austria (ÖBB)
    {
        "id": "AT_VIENNA",
        "operator": "OEBB",
        "country": "AT",
        "client": hafas_clients["OEBB"],
        "bbox": (48.30, 16.20, 48.10, 16.50),
    },
    {
        "id": "AT_SALZBURG",
        "operator": "OEBB",
        "country": "AT",
        "client": hafas_clients["OEBB"],
        "bbox": (47.85, 12.95, 47.75, 13.15),
    },
    {
        "id": "AT_INNSBRUCK",
        "operator": "OEBB",
        "country": "AT",
        "client": hafas_clients["OEBB"],
        "bbox": (47.35, 11.30, 47.20, 11.50),
    },
    {
        "id": "AT_LINZ",
        "operator": "OEBB",
        "country": "AT",
        "client": hafas_clients["OEBB"],
        "bbox": (48.35, 14.20, 48.25, 14.35),
    },
    {
        "id": "AT_GRAZ",
        "operator": "OEBB",
        "country": "AT",
        "client": hafas_clients["OEBB"],
        "bbox": (47.10, 15.35, 47.00, 15.48),
    },
]

# Semáforo de concurrencia estricto: máximo 2 peticiones simultáneas
semaphore = asyncio.Semaphore(MAX_CONCURRENT_REQUESTS)

# ==============================================================================
# 4. Funciones de Extracción e Ingesta
# ==============================================================================
async def scan_zone_radar(zone: Dict[str, Any]) -> List[Any]:
    """Ejecuta la llamada bloqueante de pyhafas en un threadpool asíncrono."""
    n, w, s, e = zone["bbox"]
    client = zone["client"]
    # Radar method signature: radar(north, west, south, east)
    return await asyncio.to_thread(client.radar, n, w, s, e)

# Caché de posiciones previas para verificar quietud
_worker_train_coords: Dict[str, Tuple[float, float]] = {}

async def process_zone(
    session: aiohttp.ClientSession,
    zone: Dict[str, Any],
) -> int:
    """
    Procesa un cuadrante geográfico:
    - Adquiere el semáforo para garantizar máximo 2 peticiones HAFAS concurrentes.
    - Extrae las posiciones satelitales en tiempo real.
    - Si el tren no se ha movido respecto a la última muestra, corrige la velocidad a 0.0.
    - Transmite el payload validado vía POST al backend.
    """
    zone_id = zone["id"]
    operator = zone["operator"]
    country = zone["country"]

    async with semaphore:
        logger.debug(f"[{zone_id}] Adquiriendo slot de semáforo. Consultando HAFAS ({operator})...")
        try:
            active_trains = await scan_zone_radar(zone)
        except Exception as err:
            logger.error(f"[{zone_id}] Error consultando radar HAFAS: {err}")
            return 0

    if not active_trains:
        logger.debug(f"[{zone_id}] Cuadrante sin trenes activos en este instante.")
        return 0

    current_timestamp = datetime.now(timezone.utc).isoformat()
    payload = []

    for train in active_trains:
        train_id = f"{operator}-{train.id}"
        train_raw_name = getattr(train, "name", "") or getattr(train, "id", "")
        station_name = getattr(train, "direction", None) or "Desconocido"
        raw_speed = getattr(train, "speed", None)
        lat = float(train.latitude)
        lon = float(train.longitude)

        # Clasificación de categoría de servicio (S-Bahn / Cercanías vs Larga Distancia)
        is_cercanias = (
            train_raw_name.upper().startswith("S") or
            "S-BAHN" in train_raw_name.upper() or
            "CERCAN" in train_raw_name.upper() or
            "COMMUTER" in train_raw_name.upper()
        )
        service_category = "CERCANIAS" if is_cercanias else "ALTA_VELOCIDAD"

        # Si el tren no se mueve geográficamente, la velocidad se corrige siempre a cero
        speed = float(raw_speed) if raw_speed is not None else None
        prev_coords = _worker_train_coords.get(train_id)
        if prev_coords:
            prev_lat, prev_lon = prev_coords
            if abs(lat - prev_lat) < 0.00008 and abs(lon - prev_lon) < 0.00008:
                speed = 0.0
        elif speed is not None and speed <= 3.0:
            speed = 0.0

        _worker_train_coords[train_id] = (lat, lon)

        payload.append({
            "train_id": train_id,
            "train_name": f"{operator} {train_raw_name}" if train_raw_name else train_id,
            "service": "S-Bahn / Commuter" if is_cercanias else f"InterCity {operator}",
            "service_category": service_category,
            "line_name": f"Línea {zone_id} -> {station_name}",
            "operator": operator,
            "country": country,
            "lat": lat,
            "lon": lon,
            "is_realtime": True,  # Atributo estricto solicitado
            "last_station_name": station_name,
            "speed": speed,
            "timestamp": current_timestamp,
        })

    logger.info(
        f"[{zone_id}] Detectados {len(payload)} trenes activos. Transfiriendo telemetría al backend..."
    )

    try:
        timeout = aiohttp.ClientTimeout(total=15)
        async with session.post(BACKEND_URL, json=payload, timeout=timeout) as response:
            if response.status == 201:
                logger.info(f"[{zone_id}] Telemetría enviada con éxito. HTTP {response.status} ({len(payload)} trenes).")
                return len(payload)
            else:
                resp_text = await response.text()
                logger.warning(
                    f"[{zone_id}] Backend rechazó lote. HTTP {response.status}: {resp_text}"
                )
                return 0
    except asyncio.TimeoutError:
        logger.error(f"[{zone_id}] Timeout al enviar datos hacia {BACKEND_URL}.")
        return 0
    except Exception as exc:
        logger.error(f"[{zone_id}] Fallo de red comunicando con backend: {exc}")
        return 0

# ==============================================================================
# 5. Bucle Principal Continuo
# ==============================================================================
async def main_loop():
    logger.info("Iniciando escáner continuo de telemetría ferroviaria europea (SBB, DB, ÖBB)...")

    # Espera inicial para permitir que el backend y TimescaleDB completen el healthcheck
    await asyncio.sleep(3)

    async with aiohttp.ClientSession() as session:
        cycle_number = 1
        while True:
            cycle_start = datetime.now()
            logger.info(
                f"--- Ciclo #{cycle_number} | Escaneando {len(GRID_ZONES)} cuadrículas con semáforo (max {MAX_CONCURRENT_REQUESTS}) ---"
            )

            # Iterar sobre las cuadrículas en paralelo controlado
            tasks = [process_zone(session, zone) for zone in GRID_ZONES]
            results = await asyncio.gather(*tasks, return_exceptions=True)

            total_trains = sum(r for r in results if isinstance(r, int))
            elapsed = (datetime.now() - cycle_start).total_seconds()

            logger.info(
                f"--- Ciclo #{cycle_number} completado en {elapsed:.2f}s. Total trenes procesados: {total_trains} ---"
            )
            cycle_number += 1

            # Pausa respetuosa antes del siguiente barrido general
            logger.info(f"Esperando {SCAN_INTERVAL_SECONDS}s hasta el próximo ciclo...")
            await asyncio.sleep(SCAN_INTERVAL_SECONDS)

if __name__ == "__main__":
    try:
        asyncio.run(main_loop())
    except (KeyboardInterrupt, SystemExit):
        logger.warning("Worker detenido manualmente por señal del sistema.")

