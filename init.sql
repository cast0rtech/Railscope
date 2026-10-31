-- ==============================================================================
-- RailScope - TimescaleDB Initialization Script
-- ==============================================================================

-- 1. Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- 2. Tabla principal de telemetría de trenes
CREATE TABLE IF NOT EXISTS train_telemetry (
    time TIMESTAMPTZ NOT NULL,
    train_id VARCHAR(50) NOT NULL,
    operator VARCHAR(50) NOT NULL,
    country VARCHAR(10) NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    lon DOUBLE PRECISION NOT NULL,
    is_realtime BOOLEAN NOT NULL DEFAULT TRUE,
    last_station_name VARCHAR(100),
    speed DOUBLE PRECISION
);

-- 3. Conversión a Hypertable particionada por tiempo
SELECT create_hypertable('train_telemetry', 'time', if_not_exists => TRUE);

-- 4. Índices compuestos para consultas temporales y aceleración de búsquedas espaciales (BBOX / Viewport)
-- Búsqueda geoespacial por cuadrantes / Bounding Box (lat, lon) acotada por tiempo
CREATE INDEX IF NOT EXISTS ix_spatial_time ON train_telemetry (lat, lon, time DESC);

-- Búsqueda geoespacial segmentada por país y acotada por tiempo
CREATE INDEX IF NOT EXISTS ix_country_spatial_time ON train_telemetry (country, lat, lon, time DESC);

-- Búsqueda de histórico por unidad de tren individual
CREATE INDEX IF NOT EXISTS ix_train_time ON train_telemetry (train_id, time DESC);

-- Filtrado por operador y país en el mapa
CREATE INDEX IF NOT EXISTS ix_country_operator_time ON train_telemetry (country, operator, time DESC);

-- 5. Downsampling mediante Vista Materializada Continua (Continuous Aggregate de 15 minutos)
CREATE MATERIALIZED VIEW IF NOT EXISTS train_telemetry_15m
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('15 minutes', time) AS bucket,
    train_id,
    operator,
    country,
    last(lat, time) AS lat,
    last(lon, time) AS lon,
    avg(speed) AS avg_speed,
    last(is_realtime, time) AS is_realtime
FROM train_telemetry
GROUP BY bucket, train_id, operator, country
WITH NO DATA;

-- 6. Política de refresco automático para la Continuous Aggregate (cada 15 min con ventana de 3h)
SELECT add_continuous_aggregate_policy('train_telemetry_15m',
    start_offset => INTERVAL '3 hours',
    end_offset => INTERVAL '15 minutes',
    schedule_interval => INTERVAL '15 minutes',
    if_not_exists => TRUE
);

-- 7. Políticas de retención de datos
-- Datos crudos de alta frecuencia: expiran tras 7 días
SELECT add_retention_policy('train_telemetry', INTERVAL '7 days', if_not_exists => TRUE);

-- Datos agregados (downsampled 15m): retención extendida a 30 días para históricos
SELECT add_retention_policy('train_telemetry_15m', INTERVAL '30 days', if_not_exists => TRUE);
