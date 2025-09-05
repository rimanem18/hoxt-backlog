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
	@make down
	@make up
server:
	docker compose exec server ash
client:
	docker compose exec client ash
e2e:
	docker compose exec e2e npx playwright test
db:
	docker compose exec db ash
sql:
	docker compose exec db psql -U ${DB_USER} -d ${DB_NAME} -h ${DB_HOST} -p ${DB_PORT}
ps:
	docker compose ps
logs:
	docker compose logs -f
fmt:
	docker compose exec client bun run fix
	docker compose exec server bun run fix
amend:
	git commit --amend --no-edit
init:
	test -f .git/hooks/pre-commit || cp scripts/pre-commit .git/hooks/pre-commit
	chmod +x .git/hooks/pre-commit
