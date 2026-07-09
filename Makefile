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

EMAIL ?= test@example.com
PASSWORD ?= Test123
NAME ?= Test User
ROLE ?= student

hurl-register: ## Register user (usage: make hurl-register EMAIL=test@test.com PASSWORD=Test123 NAME="Test" ROLE=student)
	@token=$$(cat hurl/token.txt); \
	hurl --variables-file hurl/hurl.env --variable access_token=$$token --variable email=$(EMAIL) --variable password=$(PASSWORD) --variable name=$(NAME) --variable role=$(ROLE) hurl/register.hurl

hurl-login: ## Login and save token (usage: make hurl-login EMAIL=admin@test.com PASSWORD=Admin123)
	@hurl --variables-file hurl/hurl.env --variable email=$(EMAIL) --variable password=$(PASSWORD) hurl/login.hurl 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])" > hurl/token.txt
	@echo "Token saved to hurl/token.txt"

hurl-upload: ## Upload material (usage: make hurl-upload file_path=./test.pdf)
	@token=$$(cat hurl/token.txt); \
	hurl --variables-file hurl/hurl.env --variable access_token=$$token --variable file_path=$(file_path) --file-root . hurl/upload-material.hurl

hurl-list: ## List materials
	@token=$$(cat hurl/token.txt); \
	hurl --variables-file hurl/hurl.env --variable access_token=$$token hurl/list-materials.hurl

hurl-get: ## Get material (usage: make hurl-get material_id=1)
	@token=$$(cat hurl/token.txt); \
	hurl --variables-file hurl/hurl.env --variable access_token=$$token --variable material_id=$(material_id) hurl/get-material.hurl

hurl-delete: ## Delete material (usage: make hurl-delete material_id=1)
	@token=$$(cat hurl/token.txt); \
	hurl --variables-file hurl/hurl.env --variable access_token=$$token --variable material_id=$(material_id) hurl/delete-material.hurl

hurl-create-llm-config: ## Create LLM config
	@token=$$(cat hurl/token.txt); \
	hurl --variables-file hurl/hurl.env --variable access_token=$$token hurl/create-llm-config.hurl

hurl-list-llm-configs: ## List LLM configs
	@token=$$(cat hurl/token.txt); \
	hurl --variables-file hurl/hurl.env --variable access_token=$$token hurl/list-llm-configs.hurl

hurl-get-llm-config: ## Get LLM config (usage: make hurl-get-llm-config config_id=1)
	@token=$$(cat hurl/token.txt); \
	hurl --variables-file hurl/hurl.env --variable access_token=$$token --variable config_id=$(config_id) hurl/get-llm-config.hurl

hurl-update-llm-config: ## Update LLM config (usage: make hurl-update-llm-config config_id=1)
	@token=$$(cat hurl/token.txt); \
	hurl --variables-file hurl/hurl.env --variable access_token=$$token --variable config_id=$(config_id) hurl/update-llm-config.hurl

hurl-delete-llm-config: ## Delete LLM config (usage: make hurl-delete-llm-config config_id=1)
	@token=$$(cat hurl/token.txt); \
	hurl --variables-file hurl/hurl.env --variable access_token=$$token --variable config_id=$(config_id) hurl/delete-llm-config.hurl

hurl-assign-llm-config: ## Assign LLM config to student (usage: make hurl-assign-llm-config student_id=1 config_id=1)
	@token=$$(cat hurl/token.txt); \
	hurl --variables-file hurl/hurl.env --variable access_token=$$token --variable student_id=$(student_id) --variable config_id=$(config_id) hurl/assign-llm-config.hurl

hurl-list-student-llm-configs: ## List student's LLM configs (usage: make hurl-list-student-llm-configs student_id=1)
	@token=$$(cat hurl/token.txt); \
	hurl --variables-file hurl/hurl.env --variable access_token=$$token --variable student_id=$(student_id) hurl/list-student-llm-configs.hurl

hurl-remove-llm-config-assignment: ## Remove LLM config assignment (usage: make hurl-remove-llm-config-assignment assignment_id=1)
	@token=$$(cat hurl/token.txt); \
	hurl --variables-file hurl/hurl.env --variable access_token=$$token --variable assignment_id=$(assignment_id) hurl/remove-llm-config-assignment.hurl

seed-admin: ## Create first admin user (usage: make seed-admin ADMIN_EMAIL=admin@test.com ADMIN_PASSWORD=Admin123 ADMIN_NAME="Admin")
	ADMIN_EMAIL=$(ADMIN_EMAIL) ADMIN_PASSWORD=$(ADMIN_PASSWORD) ADMIN_NAME=$(ADMIN_NAME) PYTHONPATH=. $(PYTHON) scripts/seed_admin.py

hurl-create-user: ## Create user (usage: make hurl-create-user)
	@token=$$(cat hurl/token.txt); \
	hurl --variables-file hurl/hurl.env --variable access_token=$$token hurl/create-user.hurl

setup: install db-up ## Initial project setup
	@echo "Project setup complete!"
	@echo "Run 'make run' to start the server"
