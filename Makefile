include .env
.PHONY: build up down server client e2e db iac iac-init iac-plan-save iac-bootstrap-apply iac-apply sql ps logs fmt amend restart init db-migrate-preview db-migrate-production frontend-deploy-preview generate-all

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
	@docker compose exec iac bash -c 'source ./scripts/create-session.sh && \
			export CLOUDFLARE_API_TOKEN=${CLOUDFLARE_API_TOKEN} && \
			export CLOUDFLARE_ACCOUNT_ID=${CLOUDFLARE_ACCOUNT_ID} && \
			export PROJECT_NAME=${PROJECT_NAME} && \
			export REPOSITORY_NAME=${REPOSITORY_NAME} && \
			exec bash'
iac-init:
	@echo "Terraform初期化（Bootstrap/App両構成）..."
	@echo ""
	@echo "🔄 Step 1/2: Bootstrap構成の初期化..."
	@docker compose exec iac bash -c 'source ./scripts/create-session.sh && \
		export CLOUDFLARE_API_TOKEN=${CLOUDFLARE_API_TOKEN} && \
		export CLOUDFLARE_ACCOUNT_ID=${CLOUDFLARE_ACCOUNT_ID} && \
		export PROJECT_NAME=${PROJECT_NAME} && \
		export REPOSITORY_NAME=${REPOSITORY_NAME} && \
		export TF_VAR_database_url=${DATABASE_URL} && \
		cd bootstrap && \
		terraform init \
			-backend-config="bucket=${PROJECT_NAME}-terraform-state" \
			-backend-config="key=bootstrap/terraform.tfstate" \
			-backend-config="region=${AWS_REGION}" \
			-backend-config="dynamodb_table=${PROJECT_NAME}-terraform-locks"'
	@echo ""
	@echo "🔄 Step 2/2: App構成の初期化..."
	@docker compose exec iac bash -c 'source ./scripts/create-session.sh && \
		cd app && \
		terraform init \
			-backend-config="bucket=${PROJECT_NAME}-terraform-state" \
			-backend-config="key=app/terraform.tfstate" \
			-backend-config="region=${AWS_REGION}" \
			-backend-config="dynamodb_table=${PROJECT_NAME}-terraform-locks"'
	@echo ""
	@echo "✅ Terraform初期化が完了しました。"
	@echo "💡 以降は 'make iac-plan-save' で計画実行が可能です。"
iac-plan-save:
	@echo "統合Terraform計画をファイルに保存（Bootstrap→App自動実行）..."
	@docker compose exec server bun run build:lambda
	@cp app/server/dist/index.js terraform/modules/lambda/lambda.js || echo "Warning: index.js not found, using fallback && exit 1"
	@echo "index.jsをterraform/modules/lambdaにコピーしました。"
	@echo ""
	@echo "🔄 Step 1/2: Bootstrap構成の計画実行..."
	@docker compose exec iac bash -c 'source ./scripts/create-session.sh && \
		export CLOUDFLARE_API_TOKEN=${CLOUDFLARE_API_TOKEN} && \
		export CLOUDFLARE_ACCOUNT_ID=${CLOUDFLARE_ACCOUNT_ID} && \
		export PROJECT_NAME=${PROJECT_NAME} && \
		export REPOSITORY_NAME=${REPOSITORY_NAME} && \
		export TF_VAR_database_url=${DATABASE_URL} && \
		export TF_VAR_access_allow_origin_production=${ACCESS_ALLOW_ORIGIN_PRODUCTION} && \
		export TF_VAR_access_allow_origin_preview=${ACCESS_ALLOW_ORIGIN_PREVIEW} && \
		export TF_VAR_next_public_supabase_url=${NEXT_PUBLIC_SUPABASE_URL} && \
		export TF_VAR_metrics_namespace=${METRICS_NAMESPACE} && \
		cd bootstrap && \
		rm -f plan-output.* && \
		terraform plan -out=terraform.tfplan && \
		terraform show -no-color terraform.tfplan > plan-output.txt'
	@echo ""
	@echo "🔄 Step 2/2: App構成の計画実行..."
	@docker compose exec iac bash -c 'source ./scripts/create-session.sh && \
		export TF_VAR_ops_email=${OPS_EMAIL} && \
		cd app && \
		rm -f plan-output.* && \
		terraform plan -out=terraform.tfplan && \
		terraform show -no-color terraform.tfplan > plan-output.txt'
	@echo ""
	@echo "✅ 統合Terraform計画が完了しました。"
	@echo "📁 Bootstrap計画: terraform/bootstrap/plan-output.txt"
	@echo "📁 App計画: terraform/app/plan-output.txt"
iac-bootstrap-apply:
	@echo "Bootstrap構成を適用（強力な権限・インフラ初期構築）..."
	@docker compose exec iac bash -c 'source ./scripts/create-session.sh && \
		export CLOUDFLARE_API_TOKEN=${CLOUDFLARE_API_TOKEN} && \
		export CLOUDFLARE_ACCOUNT_ID=${CLOUDFLARE_ACCOUNT_ID} && \
		export PROJECT_NAME=${PROJECT_NAME} && \
		export REPOSITORY_NAME=${REPOSITORY_NAME} && \
		export TF_VAR_database_url=${DATABASE_URL} && \
		export TF_VAR_access_allow_origin_production=${ACCESS_ALLOW_ORIGIN_PRODUCTION} && \
		export TF_VAR_access_allow_origin_preview=${ACCESS_ALLOW_ORIGIN_PREVIEW} && \
		export TF_VAR_metrics_namespace=${METRICS_NAMESPACE} && \
		cd bootstrap && \
		terraform apply terraform.tfplan'
	@echo "✅ Bootstrap構成の適用が完了しました。"

iac-apply:
	@echo "App構成を適用（制限権限・日常的変更）..."
	@docker compose exec iac bash -c 'source ./scripts/create-session.sh && \
		export TF_VAR_ops_email=${OPS_EMAIL} && \
		cd app && terraform apply terraform.tfplan'
	@echo "✅ App構成の適用が完了しました。"


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
generate-all:
	@echo "型定義自動生成を開始します..."
	@echo ""
	@echo "🔄 Step 1/3: Generating Zod schemas from Drizzle..."
	docker compose exec server bun run generate:schemas
	@echo ""
	@echo "🔄 Step 2/3: Generating OpenAPI spec..."
	docker compose exec server bun run generate:openapi
	@echo ""
	@echo "🔄 Step 3/3: Generating TypeScript types..."
	docker compose exec client bun run generate:types
	@echo ""
	@echo "🔧 Formatting generated files..."
	docker compose exec server bun run fix
	docker compose exec client bun run fix
	@echo ""
	@echo "✅ All type definitions generated successfully"
