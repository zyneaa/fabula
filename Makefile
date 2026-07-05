.PHONY: help install dev run test lint format db-up db-down db-migrate db-upgrade clean docker-up docker-down

VENV := .venv
PYTHON := $(VENV)/bin/python
PIP := $(VENV)/bin/pip
PORT := 8000

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

install: ## Install dependencies
	$(PIP) install -r requirements.txt

dev: ## Install dev dependencies and setup
	$(PIP) install -r requirements.txt pytest pytest-asyncio

run: ## Run the development server
	uvicorn app.main:app --reload

test: ## Run tests
	$(PYTHON) -m pytest tests/ -v

lint: ## Run linter
	$(PYTHON) -m ruff check app/ tests/

format: ## Format code
	$(PYTHON) -m ruff format app/ tests/

db-up: ## Start database with docker-compose
	docker-compose up -d db

db-down: ## Stop database
	docker-compose down

db-migrate: ## Create a new migration (usage: make db-migrate msg="description")
	$(PYTHON) -m alembic revision --autogenerate -m "$(msg)"

db-upgrade: ## Apply database migrations
	$(PYTHON) -m alembic upgrade head

db-downgrade: ## Rollback last migration
	$(PYTHON) -m alembic downgrade -1

db-history: ## Show migration history
	$(PYTHON) -m alembic history

db-reset: ## Reset database (drop all and recreate)
	docker-compose down -v
	docker-compose up -d db
	@sleep 2
	$(PYTHON) -m alembic upgrade head

clean: ## Clean up cache and temporary files
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete 2>/dev/null || true
	rm -rf .pytest_cache

docker-up: ## Start all docker services
	docker-compose up -d

docker-down: ## Stop all docker services
	docker-compose down

docker-logs: ## View docker logs
	docker-compose logs -f

hurl-register: ## Register user via hurl
	hurl --variables-file hurl/hurl.env hurl/register.hurl

hurl-login: ## Login and save token
	@hurl --variables-file hurl/hurl.env hurl/login.hurl 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])" > hurl/token.txt
	@echo "Token saved to hurl/token.txt"

hurl-upload: ## Upload material (usage: make hurl-upload file_path=./test.pdf)
	@token=$$(cat hurl/token.txt); \
	hurl --variable access_token=$$token --variable file_path=$(file_path) hurl/upload-material.hurl

hurl-list: ## List materials
	@token=$$(cat hurl/token.txt); \
	hurl --variables-file hurl/hurl.env --variable access_token=$$token hurl/list-materials.hurl

hurl-get: ## Get material (usage: make hurl-get material_id=1)
	@token=$$(cat hurl/token.txt); \
	hurl --variable access_token=$$token --variable material_id=$(material_id) hurl/get-material.hurl

hurl-delete: ## Delete material (usage: make hurl-delete material_id=1)
	@token=$$(cat hurl/token.txt); \
	hurl --variable access_token=$$token --variable material_id=$(material_id) hurl/delete-material.hurl

setup: install db-up ## Initial project setup
	@echo "Project setup complete!"
	@echo "Run 'make run' to start the server"
