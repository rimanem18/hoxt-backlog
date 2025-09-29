include .env
.PHONY: build up down server client e2e db iac iac-init iac-plan iac-apply sql ps logs fmt amend restart init db-migrate-preview db-migrate-production

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
	@docker compose exec iac bash -c 'source ./scripts/create-session.sh && exec bash'
iac-init:
	@echo "統合Terraform初期化を実行..."
	@docker compose exec iac bash -c 'source ./scripts/create-session.sh && \
		terraform init --migrate-state \
			-backend-config="bucket=${PROJECT_NAME}-terraform-state" \
			-backend-config="key=${PROJECT_NAME}/${ENVIRONMENT}/terraform.tfstate" \
			-backend-config="region=${AWS_REGION}" \
			-backend-config="dynamodb_table=${PROJECT_NAME}-terraform-locks" \
			-backend-config="encrypt=true"'
iac-plan-save:
	@echo "統合Terraform計画をファイルに保存..."
	@docker compose exec server bun run build:lambda
	@cp app/server/dist/lambda.js terraform/modules/lambda/lambda.js || echo "Warning: lambda.js not found, using fallback && exit 1"
	@echo "lambda.jsをterraform/modules/lambdaにコピーしました。"
	@docker compose exec iac bash -c 'source ./scripts/create-session.sh && \
		rm -f plan-output.* && terraform plan -out=terraform.tfplan && terraform show -no-color terraform.tfplan > plan-output.txt'
iac-apply:
	@echo "統合Terraform適用を実行..."
	@docker compose exec iac bash -c 'source ./scripts/create-session.sh && \
		terraform apply terraform.tfplan'
frontend-deploy-preview:
	@echo "ビルドします..."
	@docker compose exec client ash -c ' \
	export NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL} && \
	export NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL} && \
	export NEXT_PUBLIC_TRUSTED_DOMAINS=${NEXT_PUBLIC_TRUSTED_DOMAINS} && \
	bun run build'
	@echo "フロントエンドをCloudflareにデプロイします..."
	@docker compose exec client ash -c ' \
		export CLOUDFLARE_API_TOKEN=${CLOUDFLARE_API_TOKEN} && \
		export CLOUDFLARE_ACCOUNT_ID=${CLOUDFLARE_ACCOUNT_ID} && \
		npx --yes wrangler@latest pages deploy ./out \
		--project-name ${PROJECT_NAME} \
		--branch preview \
		--commit-dirty=true'
db-migrate-preview:
	@echo "プレビュー環境のデータベースマイグレーションを実行します..."
	@docker compose exec server ash -c ' \
		export ENVIRONMENT=preview && \
		export BASE_SCHEMA=app_${PROJECT_NAME}_preview && \
		export DATABASE_URL=${DATABASE_URL} && \
		bun run db:setup'
	@echo "プレビュー環境のデータベースマイグレーションが完了しました。"
db-migrate-production:
	@echo "本番環境のデータベースマイグレーションを実行します..."
	@docker compose exec server ash -c ' \
		export ENVIRONMENT=production && \
		export BASE_SCHEMA=app_${PROJECT_NAME} && \
		export DATABASE_URL=${DATABASE_URL} && \
		bun run db:setup'
	@echo "本番環境のデータベースマイグレーションが完了しました。"
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
