include .env
.PHONY: build up down server client e2e db iac iac-init iac-plan-save iac-bootstrap-apply iac-apply sql ps logs fmt amend restart init db-migrate-preview db-migrate-production frontend-deploy-preview generate-all build-check

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
	docker compose exec server bash
client:
	docker compose exec client bash
e2e:
	docker compose exec e2e bash
db:
	docker compose exec db ash
# iacサービスは./app/server/distをbind mountするため、ホスト側に未作成のまま
# コンテナを起動するとDockerがマウントポイントをroot所有で自動生成してしまう。
# それを避けるため、iac系ターゲットの先頭で必ずディレクトリを用意しておく。
iac:
	@mkdir -p app/server/dist
	@echo "Terraformロールを引き受けて、iacコンテナに入ります..."
	@docker compose exec \
			-e CLOUDFLARE_API_TOKEN=${CLOUDFLARE_API_TOKEN} \
			-e CLOUDFLARE_ACCOUNT_ID=${CLOUDFLARE_ACCOUNT_ID} \
			-e PROJECT_NAME=${PROJECT_NAME} \
			-e REPOSITORY_NAME=${REPOSITORY_NAME} \
			iac bash -c 'source ./scripts/create-session.sh && exec bash'
iac-init:
	@mkdir -p app/server/dist
	@echo "Terraform初期化（Bootstrap/App両構成）..."
	@echo ""
	@echo "🔄 Step 1/2: Bootstrap構成の初期化..."
	@docker compose exec \
		-e CLOUDFLARE_API_TOKEN=${CLOUDFLARE_API_TOKEN} \
		-e CLOUDFLARE_ACCOUNT_ID=${CLOUDFLARE_ACCOUNT_ID} \
		-e PROJECT_NAME=${PROJECT_NAME} \
		-e REPOSITORY_NAME=${REPOSITORY_NAME} \
		-e TF_VAR_database_url=${DATABASE_URL} \
		iac bash -c 'source ./scripts/create-session.sh && \
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
	@mkdir -p app/server/dist
	@echo "統合Terraform計画をファイルに保存（Bootstrap→App自動実行）..."
	@docker compose exec server bun run build:lambda
	@cp app/server/dist/index.js terraform/modules/lambda/lambda.js || echo "Warning: index.js not found, using fallback && exit 1"
	@echo "index.jsをterraform/modules/lambdaにコピーしました。"
	@echo ""
	@echo "🔄 Step 1/2: Bootstrap構成の計画実行..."
	@docker compose exec \
		-e CLOUDFLARE_API_TOKEN=${CLOUDFLARE_API_TOKEN} \
		-e CLOUDFLARE_ACCOUNT_ID=${CLOUDFLARE_ACCOUNT_ID} \
		-e PROJECT_NAME=${PROJECT_NAME} \
		-e REPOSITORY_NAME=${REPOSITORY_NAME} \
		-e TF_VAR_database_url=${DATABASE_URL} \
		-e TF_VAR_access_allow_origin_production=${ACCESS_ALLOW_ORIGIN_PRODUCTION} \
		-e TF_VAR_access_allow_origin_preview=${ACCESS_ALLOW_ORIGIN_PREVIEW} \
		-e TF_VAR_next_public_supabase_url=${SUPABASE_URL} \
		-e TF_VAR_supabase_publishable_key=${SUPABASE_PUBLISHABLE_KEY} \
		-e TF_VAR_metrics_namespace=${METRICS_NAMESPACE} \
		iac bash -c 'source ./scripts/create-session.sh && \
		cd bootstrap && \
		rm -f plan-output.* && \
		terraform plan -out=terraform.tfplan && \
		terraform show -no-color terraform.tfplan > plan-output.txt'
	@echo ""
	@echo "🔄 Step 2/2: App構成の計画実行..."
	@docker compose exec \
		-e TF_VAR_ops_email=${OPS_EMAIL} \
		iac bash -c 'source ./scripts/create-session.sh && \
		cd app && \
		rm -f plan-output.* && \
		terraform plan -out=terraform.tfplan && \
		terraform show -no-color terraform.tfplan > plan-output.txt'
	@echo ""
	@echo "✅ 統合Terraform計画が完了しました。"
	@echo "📁 Bootstrap計画: terraform/bootstrap/plan-output.txt"
	@echo "📁 App計画: terraform/app/plan-output.txt"
iac-bootstrap-apply:
	@mkdir -p app/server/dist
	@echo "Bootstrap構成を適用（強力な権限・インフラ初期構築）..."
	@docker compose exec \
		-e CLOUDFLARE_API_TOKEN=${CLOUDFLARE_API_TOKEN} \
		-e CLOUDFLARE_ACCOUNT_ID=${CLOUDFLARE_ACCOUNT_ID} \
		-e PROJECT_NAME=${PROJECT_NAME} \
		-e REPOSITORY_NAME=${REPOSITORY_NAME} \
		-e TF_VAR_database_url=${DATABASE_URL} \
		-e TF_VAR_access_allow_origin_production=${ACCESS_ALLOW_ORIGIN_PRODUCTION} \
		-e TF_VAR_access_allow_origin_preview=${ACCESS_ALLOW_ORIGIN_PREVIEW} \
		-e TF_VAR_metrics_namespace=${METRICS_NAMESPACE} \
		iac bash -c 'source ./scripts/create-session.sh && \
		cd bootstrap && \
		terraform apply terraform.tfplan'
	@echo "✅ Bootstrap構成の適用が完了しました。"

iac-apply:
	@mkdir -p app/server/dist
	@echo "App構成を適用（制限権限・日常的変更）..."
	@docker compose exec iac bash -c 'source ./scripts/create-session.sh && \
		export TF_VAR_ops_email=${OPS_EMAIL} && \
		cd app && terraform apply terraform.tfplan'
	@echo "✅ App構成の適用が完了しました。"

# 手動作成済みリソースをterraform stateへ取り込む（Terraform実行ロールに新規作成権限を
# 与えたくないリソース向け。 例: make iac-import ADDR=module.ses.aws_iam_policy.foo ID=arn:...）
iac-import:
	@docker compose exec \
		-e CLOUDFLARE_API_TOKEN=${CLOUDFLARE_API_TOKEN} \
		-e CLOUDFLARE_ACCOUNT_ID=${CLOUDFLARE_ACCOUNT_ID} \
		-e PROJECT_NAME=${PROJECT_NAME} \
		-e REPOSITORY_NAME=${REPOSITORY_NAME} \
		-e TF_VAR_database_url=${DATABASE_URL} \
		-e TF_VAR_access_allow_origin_production=${ACCESS_ALLOW_ORIGIN_PRODUCTION} \
		-e TF_VAR_access_allow_origin_preview=${ACCESS_ALLOW_ORIGIN_PREVIEW} \
		-e TF_VAR_next_public_supabase_url=${SUPABASE_URL} \
		-e TF_VAR_supabase_publishable_key=${SUPABASE_PUBLISHABLE_KEY} \
		-e TF_VAR_metrics_namespace=${METRICS_NAMESPACE} \
		iac bash -c 'source ./scripts/create-session.sh && cd bootstrap && terraform import $(ADDR) $(ID)'


frontend-deploy-preview:
	@echo "ビルドします..."
	@docker compose exec \
		-e NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL} \
		-e NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL} \
		-e NEXT_PUBLIC_TRUSTED_DOMAINS=${NEXT_PUBLIC_TRUSTED_DOMAINS} \
		client bun run build:worker
	@echo "フロントエンドをCloudflareにデプロイします..."
	@docker compose exec \
		-e CLOUDFLARE_API_TOKEN=${CLOUDFLARE_API_TOKEN} \
		-e CLOUDFLARE_ACCOUNT_ID=${CLOUDFLARE_ACCOUNT_ID} \
		client bunx wrangler deploy --name ${PROJECT_NAME}-preview
db-migrate-preview:
	@echo "プレビュー環境のデータベースマイグレーションを実行します..."
	@docker compose exec \
		-e ENVIRONMENT=preview \
		-e BASE_SCHEMA=app_${PROJECT_NAME}_preview \
		-e DATABASE_URL=${DATABASE_URL} \
		server bun run db:setup
	@echo "プレビュー環境のデータベースマイグレーションが完了しました。"
db-migrate-production:
	@echo "本番環境のデータベースマイグレーションを実行します..."
	@docker compose exec \
		-e ENVIRONMENT=production \
		-e BASE_SCHEMA=app_${PROJECT_NAME} \
		-e DATABASE_URL=${DATABASE_URL} \
		server bun run db:setup
	@echo "本番環境のデータベースマイグレーションが完了しました。"
sql:
	docker compose exec db psql -U ${DB_USER} -d ${DB_USER} -h db -p 5432
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
	cp scripts/pre-commit .git/hooks/pre-commit
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
build-check:
	docker compose exec client bun run build
	docker compose exec server bun run build:lambda
semgrep:
	docker compose run --rm semgrep semgrep --config=auto

