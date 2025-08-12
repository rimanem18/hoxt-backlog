include .env
.PHONY: build up down server client ps logs fmt amend restart

up:
	docker compose up -d
	@echo "Client is running at http://localhost:${CLIENT_PORT}"
	@echo "Server is running at http://localhost:${SERVER_PORT}"
down:
	docker compose down --remove-orphans
build:
	docker compose build
restart:
	docker compose restart
server:
	docker compose exec server ash
client:
	docker compose exec client ash
db:
	docker compose exec db bash
sql:
	docker compose exec db psql -U postgres -d postgres
ps:
	docker compose ps
logs:
	docker compose logs -f
fmt:
	docker compose exec client bun run fix
	docker compose exec server bun run fix
amend:
	git commit --amend --no-edit
