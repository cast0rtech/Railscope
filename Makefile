# ==============================================================================
# RailScope - DevOps Management Automation (Makefile)
# ==============================================================================

.DEFAULT_GOAL := help
COMPOSE := $(shell which docker-compose 2>/dev/null || echo "docker compose")

.PHONY: help start stop logs restart status clean

help: ## Muestra este menú de ayuda
	@echo "=================================================================="
	@echo " RailScope - Automatización de Comandos de Infraestructura"
	@echo "=================================================================="
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'

start: ## Compila y levanta todos los servicios en segundo plano
	@echo "==> Levantando stack completo de RailScope (TimescaleDB, API, Worker, Observabilidad)..."
	$(COMPOSE) up --build -d

stop: ## Detiene y apaga los contenedores activos
	@echo "==> Deteniendo contenedores de RailScope..."
	$(COMPOSE) down

logs: ## Muestra la salida unificada de logs de todos los servicios en tiempo real
	@echo "==> Mostrando logs unificados (Ctrl+C para salir)..."
	$(COMPOSE) logs -f

restart: ## Reinicia los contenedores
	@echo "==> Reiniciando servicios..."
	$(COMPOSE) restart

status: ## Muestra el estado actual y puertos de los contenedores
	@echo "==> Estado del stack RailScope:"
	$(COMPOSE) ps

clean: ## Detiene servicios y purga volúmenes y redes huérfanas
	@echo "==> Limpiando contenedores, redes y volúmenes de desarrollo..."
	$(COMPOSE) down -v --remove-orphans

