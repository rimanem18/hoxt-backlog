# Phase 2: viewerドメインのEntity・エラー・TokenHasher

## 1. このフェーズの目的

`ProjectViewerEntity`/`ViewerAccessTokenEntity`/viewerドメインの共通エラークラス/`TokenHasher`を実装し、Phase 3以降（招待API、一覧・取り消しAPI、横断閲覧API）すべての前提となるドメインロジックの土台を成立させる。

## 2. 確認可能なこと

- `ProjectViewerEntity`の単体テストで、`revoke()`/`restore()`による状態遷移が機能する
- `ViewerAccessTokenEntity`の単体テストで、`isExpired(now)`の境界値（requirements.md AC-10: 発行から30日ちょうどは有効、30日を超過すると無効。すなわち`now > expiresAt`のときのみ`true`）が機能する
- `TokenHasher`の単体テストで、トークン生成のランダム性とハッシュの決定性が確認できる

## 3. 関連要件・関連設計

- **関連要件**: REQ-004, REQ-105, REQ-106, REQ-301, REQ-302, REQ-303, REQ-304, REQ-306, REQ-503, NFR-101
- **関連設計**: design.md §4.1（コンポーネント構成）, §7.2（エラー方針）, §13（AC-10境界値の単体テスト指定）

## 4. 依存関係

- **前提フェーズ**: Phase 1
- **ブロッカー**: なし
- **注意**: このフェーズは「viewer招待」というユーザー価値そのものはまだ提供しない、Phase 3〜6の前提となるドメイン層のみのフェーズである。Repository・API層は含まない

## 5. タスク一覧

- [ ] **TASK-2-01: viewerドメインの共通エラークラス実装（Red→Green）**
  - **タイプ**: TDD
  - **依存タスク**: Phase 1
  - **関連要件**: REQ-301, REQ-302, REQ-303, REQ-304, REQ-306
  - **関連設計**: design.md §7.2
  - **実装詳細**:
    - `app/server/src/viewer/domain/errors/`に`ViewerDomainError`（抽象基底、`TaskDomainError`/`ProjectDomainError`と同型）を実装する
    - `InvalidViewerDataError`（400, `VALIDATION_ERROR`）: メール形式不正・自己招待
    - `ViewerNotFoundError`（404, `VIEWER_NOT_FOUND`）: 取り消し対象が存在しない/既に取り消し済み
    - `InvalidViewerAccessTokenError`（401, `UNAUTHORIZED_VIEWER_TOKEN`）: トークン不正・失効・期限切れ
    - `InvitationMailDeliveryError`（502, `MAIL_DELIVERY_FAILED`）: 送信失敗
    - `index.ts`でexportをまとめる。project所有権エラーは新設せず、既存`ProjectNotFoundError`を再利用する方針のため、ここでは作成しない
  - **完了条件**: 各エラークラスが`ViewerDomainError`を継承し、`status`・`code`プロパティを持つこと
  - **単体テスト要件**: `app/server/src/viewer/domain/__tests__/errors.test.ts`に、`task`/`project`ドメインの`errors.test.ts`と同等の観点でエラークラスの型・プロパティを検証する

- [ ] **TASK-2-02: `ProjectViewerEntity`の実装（Red→Green）**
  - **タイプ**: TDD
  - **依存タスク**: TASK-2-01
  - **関連要件**: REQ-105, REQ-106, REQ-503
  - **関連設計**: design.md §4.1（`ProjectViewerEntity`）, §6（状態遷移）
  - **実装詳細**:
    - `app/server/src/viewer/domain/ProjectViewerEntity.ts`に、`id`, `projectId`, `email`(共有`EmailAddress`), `status`(`active`/`revoked`), `invitedAt`, `revokedAt`, `createdAt`, `updatedAt`を保持するエンティティを実装する
    - `create`（新規招待、status=active）/`reconstruct`ファクトリ、`revoke()`（status→revoked、revokedAt設定）、`restore()`（status→active、revokedAtクリア）を実装する
  - **完了条件**: `create`で`active`状態のインスタンスが生成できる。`revoke()`後は`status`が`revoked`かつ`revokedAt`が設定される。`restore()`後は`status`が`active`かつ`revokedAt`が`null`になる
  - **単体テスト要件**: 正常系（新規生成）、`revoke()`による状態遷移、`restore()`による状態遷移とrevokedAtのクリア

- [ ] **TASK-2-03: `ViewerAccessTokenEntity`の実装（Red→Green）**
  - **タイプ**: TDD
  - **依存タスク**: TASK-2-01
  - **関連要件**: REQ-004, REQ-102, REQ-103, REQ-501, REQ-502, NFR-101
  - **関連設計**: design.md §4.1（`ViewerAccessTokenEntity`）, §13
  - **実装詳細**:
    - `app/server/src/viewer/domain/ViewerAccessTokenEntity.ts`に、`id`, `email`(共有`EmailAddress`), `tokenHash`, `expiresAt`, `createdAt`, `updatedAt`を保持するエンティティを実装する
    - 生トークンはEntity生成時（新規発行時）のみコンストラクタ引数として一時的に受け取れるが、永続化対象のプロパティとしては保持しない
    - `isExpired(now: Date): boolean`を実装する。判定は`now > expiresAt`のときのみ`true`とする（requirements.md AC-10準拠。overview.md 2章の設計差分メモを参照し、design.md §13の`now >= expiresAt`は採用しない）
  - **完了条件**: `isExpired(now)`が、`now <= expiresAt`（30日ちょうどを含む）で`false`、`now > expiresAt`（30日超過）で`true`を返すこと
  - **単体テスト要件**: 境界値（発行から30日ちょうど＝有効、30日を1ミリ秒でも超過＝無効）をAC-10相当の単体テストとして明示的に検証する

- [ ] **TASK-2-04: `TokenHasher`の実装（Red→Green）**
  - **タイプ**: TDD
  - **依存タスク**: なし
  - **関連要件**: NFR-101
  - **関連設計**: design.md §4.1（`TokenHasher`）, §10.2
  - **実装詳細**: `app/server/src/viewer/infrastructure/TokenHasher.ts`に、`node:crypto`の`randomBytes(32)`で生トークンを生成する`generate()`と、`createHash('sha256')`でハッシュ化する`hash(rawToken: string)`を実装する
  - **完了条件**: `generate()`が毎回異なる値を返す。同一入力の`hash()`は常に同一のハッシュ値を返し、異なる入力は異なるハッシュ値になる
  - **単体テスト要件**: 生成トークンの長さ・形式、ハッシュの決定性（同一入力→同一出力）と非衝突性（異なる入力→異なる出力）

## 6. このフェーズの完了条件

- `ProjectViewerEntity`/`ViewerAccessTokenEntity`/viewerドメインエラークラス/`TokenHasher`が実装されていること
- `ViewerAccessTokenEntity.isExpired`がrequirements.md AC-10の境界値を満たすこと
- サーバー側の型チェックがエラーゼロであること
- 新規テスト・既存テストがすべてグリーンであること
