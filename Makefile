include .env
.PHONY: build up down server client e2e db iac iac-init iac-plan iac-apply sql ps logs fmt amend restart init

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
iac:
	@echo "Terraformロールを引き受けて、iacコンテナに入ります..."
	@docker compose exec iac bash -c '\
		echo "=== AWS認証情報を設定中 ==="; \
		ROLE_INFO=$$(aws sts assume-role --role-arn ${AWS_ROLE_ARN} --role-session-name terraform-session --output json); \
		export AWS_ACCESS_KEY_ID=$$(echo $$ROLE_INFO | jq -r ".Credentials.AccessKeyId"); \
		export AWS_SECRET_ACCESS_KEY=$$(echo $$ROLE_INFO | jq -r ".Credentials.SecretAccessKey"); \
		export AWS_SESSION_TOKEN=$$(echo $$ROLE_INFO | jq -r ".Credentials.SessionToken"); \
		echo "✅ 認証完了: $$(aws sts get-caller-identity --query Arn --output text)"; \
		exec bash'
iac-init:
	@echo "Terraform初期化を実行..."
	@docker compose exec iac bash -c '\
		ROLE_INFO=$$(aws sts assume-role --role-arn ${AWS_ROLE_ARN} --role-session-name terraform-session --output json); \
		export AWS_ACCESS_KEY_ID=$$(echo $$ROLE_INFO | jq -r ".Credentials.AccessKeyId"); \
		export AWS_SECRET_ACCESS_KEY=$$(echo $$ROLE_INFO | jq -r ".Credentials.SecretAccessKey"); \
		export AWS_SESSION_TOKEN=$$(echo $$ROLE_INFO | jq -r ".Credentials.SessionToken"); \
		terraform init'
iac-plan:
	@echo "Terraform計画を表示..."
	@docker compose exec iac bash -c '\
		ROLE_INFO=$$(aws sts assume-role --role-arn ${AWS_ROLE_ARN} --role-session-name terraform-session --output json); \
		export AWS_ACCESS_KEY_ID=$$(echo $$ROLE_INFO | jq -r ".Credentials.AccessKeyId"); \
		export AWS_SECRET_ACCESS_KEY=$$(echo $$ROLE_INFO | jq -r ".Credentials.SecretAccessKey"); \
		export AWS_SESSION_TOKEN=$$(echo $$ROLE_INFO | jq -r ".Credentials.SessionToken"); \
		terraform plan -out=terraform.tfplan'
iac-plan-save:
	@echo "Terraform計画をファイルに保存..."
	@docker compose exec iac bash -c '\
		ROLE_INFO=$$(aws sts assume-role --role-arn ${AWS_ROLE_ARN} --role-session-name terraform-session --output json); \
		export AWS_ACCESS_KEY_ID=$$(echo $$ROLE_INFO | jq -r ".Credentials.AccessKeyId"); \
		export AWS_SECRET_ACCESS_KEY=$$(echo $$ROLE_INFO | jq -r ".Credentials.SecretAccessKey"); \
		export AWS_SESSION_TOKEN=$$(echo $$ROLE_INFO | jq -r ".Credentials.SessionToken"); \
		terraform plan -out=terraform.tfplan && terraform show -no-color terraform.tfplan > plan-output.txt'
iac-apply:
	@echo "Terraform適用を実行..."
	@docker compose exec iac bash -c '\
		ROLE_INFO=$$(aws sts assume-role --role-arn ${AWS_ROLE_ARN} --role-session-name terraform-session --output json); \
		export AWS_ACCESS_KEY_ID=$$(echo $$ROLE_INFO | jq -r ".Credentials.AccessKeyId"); \
		export AWS_SECRET_ACCESS_KEY=$$(echo $$ROLE_INFO | jq -r ".Credentials.SecretAccessKey"); \
		export AWS_SESSION_TOKEN=$$(echo $$ROLE_INFO | jq -r ".Credentials.SessionToken"); \
		terraform apply'
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
