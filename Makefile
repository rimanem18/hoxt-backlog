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
	@echo "統合Terraform初期化を実行..."
	@docker compose exec iac bash -c '\
		ROLE_INFO=$$(aws sts assume-role --role-arn ${AWS_ROLE_ARN} --role-session-name terraform-session --output json); \
		export AWS_ACCESS_KEY_ID=$$(echo $$ROLE_INFO | jq -r ".Credentials.AccessKeyId"); \
		export AWS_SECRET_ACCESS_KEY=$$(echo $$ROLE_INFO | jq -r ".Credentials.SecretAccessKey"); \
		export AWS_SESSION_TOKEN=$$(echo $$ROLE_INFO | jq -r ".Credentials.SessionToken"); \
		terraform init -reconfigure \
			-backend-config="bucket=${PROJECT_NAME}-terraform-state" \
			-backend-config="dynamodb_table=${PROJECT_NAME}-terraform-locks" \
			-backend-config="key=${PROJECT_NAME}/${ENVIRONMENT}/terraform.tfstate" \
			-backend-config="region=${AWS_REGION}"'
iac-plan-save:
	@echo "統合Terraform計画をファイルに保存..."
	@docker compose exec server bun run build:lambda
	@cp app/server/dist/lambda.js terraform/modules/lambda/lambda.js || echo "Warning: lambda.js not found, using fallback"
	@echo "lambda.jsをterraform/modules/lambdaにコピーしました。"
	@docker compose exec iac bash -c '\
		ROLE_INFO=$$(aws sts assume-role --role-arn ${AWS_ROLE_ARN} --role-session-name terraform-session --output json); \
		export AWS_ACCESS_KEY_ID=$$(echo $$ROLE_INFO | jq -r ".Credentials.AccessKeyId"); \
		export AWS_SECRET_ACCESS_KEY=$$(echo $$ROLE_INFO | jq -r ".Credentials.SecretAccessKey"); \
		export AWS_SESSION_TOKEN=$$(echo $$ROLE_INFO | jq -r ".Credentials.SessionToken"); \
		export TF_VAR_supabase_url="${SUPABASE_URL}"; \
		export TF_VAR_supabase_access_token="${SUPABASE_ACCESS_TOKEN}"; \
		export TF_VAR_jwt_secret="${SUPABASE_JWT_SECRET}"; \
		export TF_VAR_database_url="${DATABASE_URL}"; \
		rm -f plan-output.* && terraform plan -out=terraform.tfplan && terraform show -no-color terraform.tfplan > plan-output.txt'
iac-apply:
	@echo "統合Terraform適用を実行..."
	@docker compose exec iac bash -c '\
		ROLE_INFO=$$(aws sts assume-role --role-arn ${AWS_ROLE_ARN} --role-session-name terraform-session --output json); \
		export AWS_ACCESS_KEY_ID=$$(echo $$ROLE_INFO | jq -r ".Credentials.AccessKeyId"); \
		export AWS_SECRET_ACCESS_KEY=$$(echo $$ROLE_INFO | jq -r ".Credentials.SecretAccessKey"); \
		export AWS_SESSION_TOKEN=$$(echo $$ROLE_INFO | jq -r ".Credentials.SessionToken"); \
		export TF_VAR_supabase_url="${SUPABASE_URL}"; \
		export TF_VAR_supabase_access_token="${SUPABASE_ACCESS_TOKEN}"; \
		export TF_VAR_jwt_secret="${SUPABASE_JWT_SECRET}"; \
		export TF_VAR_database_url="${DATABASE_URL}"; \
		terraform apply terraform.tfplan'
sql:
	docker compose exec db psql -U postgres -d postgres -h db -p 5432
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
