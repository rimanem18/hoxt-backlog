include .env
.PHONY: build up down server

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
ps:
	docker compose ps
logs:
	docker compose logs -f
amend:
	git commit --amend --no-edit
