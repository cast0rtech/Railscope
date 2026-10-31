# ==============================================================================
# RailScope Backend - Production Dockerfile (Non-root, Multi-layer Caching)
# ==============================================================================
FROM python:3.11-slim AS runtime

# Variables de entorno de Python para producción
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PORT=8000

WORKDIR /app

# Crear usuario y grupo de sistema sin privilegios (UID/GID 10001)
RUN groupadd -g 10001 railgroup && \
    useradd -u 10001 -g railgroup -m -s /bin/sh -d /home/railuser railuser

# 1. Capa de dependencias: se aprovecha el caché de Docker
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 2. Crear directorio de logs y transferir permisos
RUN mkdir -p /app/logs && \
    chown -R railuser:railgroup /app

# 3. Copiar el código fuente de la aplicación con la propiedad del usuario non-root
COPY --chown=railuser:railgroup . .

# Cambiar al usuario no privilegiado
USER railuser

EXPOSE 8000

# Healthcheck interno del contenedor
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
    CMD python3 -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/healthz')" || exit 1

# Comando de ejecución con Uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

