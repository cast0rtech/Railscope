# ==============================================================================
# RailScope Worker - Production Dockerfile (Lightweight & Continuous Execution)
# ==============================================================================
FROM python:3.11-slim AS runtime

# Variables de entorno de Python
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Crear usuario y grupo de sistema sin privilegios (UID/GID 10002)
RUN groupadd -g 10002 workergroup && \
    useradd -u 10002 -g workergroup -m -s /bin/sh -d /home/workeruser workeruser

# 1. Capa de dependencias
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 2. Crear directorio de logs y transferir permisos
RUN mkdir -p /app/logs && \
    chown -R workeruser:workergroup /app

# 3. Copiar código fuente
COPY --chown=workeruser:workergroup . .

# Cambiar al usuario no privilegiado
USER workeruser

# Ejecutar el script asíncrono en bucle continuo
CMD ["python", "worker.py"]

