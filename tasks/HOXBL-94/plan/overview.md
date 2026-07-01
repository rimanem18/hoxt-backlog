# メールパスワード認証追加 実装プラン概要

## 1. 概要

- **Requirement ID**: HOXBL-94
- **参照要件**: tasks/HOXBL-94/spec/requirements.md
- **参照技術設計**: tasks/HOXBL-94/technical/design.md
- **目的**: Google OAuth に加えてメールアドレス＋パスワードによる認証手段を追加し、Google アカウントを持たない利用者がサービスを利用できるようにする。
- **対象**: DB スキーマ拡張、サーバー Signup API、JIT プロビジョニング拡張、クライアント全認証フロー（サインイン・サインアップ・パスワードリセット・メール確認）、事前リファクタリング、E2E テスト、運用ガイド。
- **対象外**: MFA、パスワードレス認証、Google 以外のソーシャル認証追加、確認メール再送 UI、Google ユーザー向けパスワード追加設定画面、メール文言カスタマイズ。

## 2. 前提と確認事項

### 実装着手前の必須確認事項（ブロッカー）

| ID | 確認事項 | 影響 |
|---|---|---|
| DCQ-01 | **service_role クライアント経由の `auth.signUp` で確認メールが発火するか実機検証** | 発火しない場合は代替 API（`admin.generateLink` + `admin.sendEmailOtp` 等）を採用するため Phase 3 の設計が変わる |
| DCQ-02 | **[解消] identity linking は ON を採用。** signup API の衝突チェックを app DB + Supabase Admin `getUserByEmail` の二段階構成に拡張し、未 JIT Google ユーザーへの意図しないリンクリスクを解消済み（design.md §3.1, §10）。 | （解消済み） |

### リリース前の確認事項

| ID | 確認事項 |
|---|---|
| DCQ-03 | Supabase Auth ダッシュボードのリダイレクト URL 許可リストに `/auth/reset-password`, `/auth/confirm` を追加（各環境）|
| DCQ-04 | 本番 `users.email` の重複データ不在確認（`lower(email)` UNIQUE 制約適用前） |

### 実装上の前提

- `IUserRepository.findByEmail` は既存実装済み（変更不要）。
- `POST /api/auth/verify`（既存）をメールパスワードサインイン後の JIT プロビジョニング経路として流用する。
- ログイン UI は現在 `/`（ホームページ）に存在する。設計書が示す `/login`（LoginPage）はホームページの認証 UI を指す。
- テストユーザー作成は Supabase Dashboard 手動操作のみ（実装対象外）。
- NFR-103: Supabase が OAuth / メールパスワードを問わず同形式 JWT を発行するため、既存のセッション保護方針（保持期間・失効条件）がメールパスワード認証に自動適用される。追加実装不要だが、E2E で動作を確認する。

## 3. ユースケース一覧

- **UC-01**: メールパスワードでのサインアップ
  - **結果**: 確認メールが届き、クリック後にサインイン可能になる
  - **関連要件**: REQ-101, REQ-102, REQ-201, REQ-304, REQ-302
  - **関連設計**: §3.1, §5.1

- **UC-02**: メールパスワードでのサインイン
  - **結果**: 認証セッションが発行され、ダッシュボードへ遷移する
  - **関連要件**: REQ-103, REQ-201, REQ-301, REQ-303
  - **関連設計**: §3.2, §6.1

- **UC-03**: パスワードリセット要求
  - **結果**: 登録メールアドレス宛にリセットリンクが送信される
  - **関連要件**: REQ-104
  - **関連設計**: §3.3

- **UC-04**: パスワード再設定
  - **結果**: 新パスワードでサインインできるようになる（旧パスワードは無効）
  - **関連要件**: REQ-105, REQ-305
  - **関連設計**: §3.3

- **UC-05**: メールアドレス確認
  - **結果**: アカウントが「確認済み」状態に遷移し、サインイン可能になる
  - **関連要件**: REQ-102
  - **関連設計**: §3.4

- **UC-06**: Google 済みメールでのサインアップ試行（案内表示）
  - **結果**: 二重ユーザーが作られず、Google ログインへの誘導メッセージが表示される
  - **関連要件**: REQ-002, REQ-302
  - **関連設計**: §3.1, §5.1

- **UC-07**: サインイン後の JIT プロビジョニング（email プロバイダー対応）
  - **結果**: `provider='email'` JWT で既存 Google ユーザーと合流し、同一ユーザーとして認証される
  - **関連要件**: REQ-002, REQ-003
  - **関連設計**: §7.2

## 4. フェーズ一覧

- **Phase 1: Backend - 基盤整備（AuthProvider 拡張・DB マイグレーション・スキーマ再生成）**
  - **目的**: `email` プロバイダーを型システム・DB・共有スキーマ全体で使えるようにする
  - **確認可能なこと**: `bunx tsc --noEmit` がエラーゼロ、マイグレーションファイル生成
  - **関連要件**: REQ-002
  - **関連設計**: §4.1, §4.2, §9 Migration A/B/C, §13 R1
  - **依存**: なし

- **Phase 2: Backend - AuthenticationDomainService findByEmail 合流ロジック（TDD）**
  - **目的**: email JWT の JIT プロビジョニングで既存 Google ユーザーと合流できるようにする
  - **確認可能なこと**: `AuthenticationDomainService` テストがグリーン
  - **関連要件**: REQ-002
  - **関連設計**: §7.2, §13 R4
  - **依存**: Phase 1

- **Phase 3: Backend - EmailSignupUseCase 実装（SupabaseAdminClient + UseCase TDD）**
  - **目的**: email signUp のコアロジック（衝突チェック + Supabase signUp）を実装する
  - **確認可能なこと**: `EmailSignupUseCase` ユニットテストがグリーン
  - **関連要件**: REQ-101, REQ-302, REQ-304
  - **関連設計**: §3.1, §5.1
  - **依存**: Phase 1
  - **ブロッカー**: DCQ-01（service_role 経由 signUp の確認メール発火確認）

- **Phase 4: Backend - Email Signup Route 実装（Routes + 統合テスト）**
  - **目的**: `POST /api/auth/email/signup` エンドポイントを動作させ、全レスポンスパターンを確認する
  - **確認可能なこと**: curl で 201 / 409 × 2 / 400 / 500 が確認できる
  - **関連要件**: REQ-101, REQ-302, REQ-304
  - **関連設計**: §5.1, §2.2
  - **依存**: Phase 3

- **Phase 5: Frontend - 事前リファクタリング**
  - **目的**: デッドコード削除と email エラーハンドラー新設で後続実装の土台を整える
  - **確認可能なこと**: `AuthErrorHandler` 参照消滅、`emailPasswordErrorHandler` テストグリーン
  - **関連要件**: REQ-301, REQ-303, REQ-305, NFR-101
  - **関連設計**: §6.3, §13 R2, R3
  - **依存**: なし（Phase 1 と並行可）

- **Phase 6: Frontend - メールパスワード認証プロバイダー実装**
  - **目的**: Supabase Auth SDK ラッパーとサービス層を完成させる
  - **確認可能なこと**: `emailPasswordAuthProvider` ユニットテストがグリーン
  - **関連要件**: REQ-103, REQ-201, REQ-301, REQ-303
  - **関連設計**: §6.2, §6.3, §6.4
  - **依存**: Phase 5

- **Phase 7: Frontend - ログイン画面拡張（useEmailSignin + LoginForm）**
  - **目的**: ホームページにメールパスワードフォームを追加し、サインイン end-to-end を完成させる
  - **確認可能なこと**: ブラウザで email+password を入力してダッシュボードへ遷移できること
  - **関連要件**: REQ-001, REQ-103, REQ-201, REQ-301, REQ-303
  - **関連設計**: §3.2, §6.1
  - **依存**: Phase 2, Phase 6

- **Phase 8: Frontend - サインアップフロー（SignUpPage + メール確認ページ）**
  - **目的**: `/signup` ページと `/auth/confirm` ページを追加し、サインアップ〜確認の end-to-end を完成させる
  - **確認可能なこと**: サインアップ後「確認メール送信」表示、メール確認 URL で確認完了表示
  - **関連要件**: REQ-101, REQ-102, REQ-302, REQ-304
  - **関連設計**: §3.1, §3.4, §6.1
  - **依存**: Phase 4, Phase 5

- **Phase 9: Frontend - パスワードリセット要求フロー（ForgotPassword）**
  - **目的**: `/auth/forgot-password` ページを追加し、リセットメール送信フローを完成させる
  - **確認可能なこと**: メールアドレス入力後「パスワードリセットメールを送信しました」表示
  - **関連要件**: REQ-104
  - **関連設計**: §3.3（前半）, §6.1
  - **依存**: Phase 6

- **Phase 10: Frontend - パスワード再設定フロー（ResetPassword）**
  - **目的**: `/auth/reset-password` ページを追加し、PKCE フローでのパスワード更新を完成させる
  - **確認可能なこと**: リセットリンクから新パスワードを設定して再サインインできること。無効リンクでエラーメッセージが表示されること
  - **関連要件**: REQ-105, REQ-305
  - **関連設計**: §3.3（後半）, §6.1
  - **依存**: Phase 6

- **Phase 11: E2E テスト + 運用ガイド**
  - **目的**: 主要フローを Playwright E2E テストで保護し、テストユーザー作成手順を記録する
  - **確認可能なこと**: `npx playwright test` がグリーン
  - **関連要件**: REQ-106, AC-01 〜 AC-05
  - **関連設計**: §3.5, §9
  - **依存**: Phase 7, Phase 8, Phase 9, Phase 10

## 5. リスクと注意点

- **RISK-01 既存 OAuth フローへの非互換変更**: Phase 7 で `authService.ts` を拡張する際、OAuth メソッドシグネチャは変更禁止。Phase 5 完了後に既存テストがグリーンであることを確認してから進む。
- **RISK-02 同一メールで別ユーザー作成（REQ-002 違反）**: Phase 1（`lower(email)` UNIQUE 制約）・Phase 2（JIT findByEmail 合流）・Phase 3（サインアップ前衝突チェック）の三重防御で対処。
- **RISK-03 service_role 鍵の漏洩**: Phase 3 の `SupabaseAdminClient` は環境変数のみで管理し、クライアントへ露出禁止。semgrep 静的解析で確認する。
- **RISK-04 DCQ-01 未解消のまま Phase 3 着手**: `auth.signUp` via service_role で確認メールが発火しない場合、Phase 3 の設計が大幅に変わる。Phase 3 着手前に必ず実機確認する。

## 6. スコープ外

- 確認メール再送 UI
- Google ユーザー向けパスワード追加設定画面（案内文のみ）
- メール文言カスタマイズ
- MFA・パスワードレス認証
- 連続失敗時の独自レート制限
- テストユーザー作成 UI（Supabase Dashboard 手動操作）
- `POST /auth/callback` の完全実装（TASK-904）
