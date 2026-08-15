# Phase 7: フロントエンド - viewer招待・一覧・取り消しUI

## 1. このフェーズの目的

`features/viewer-management`を新設し、project作成者がブラウザから招待・招待済みviewer一覧の確認・取り消しを行える状態を成立させる。

## 2. 確認可能なこと

- ブラウザから招待フォームでメールアドレスを送信し、成功・失敗（自己招待、不正メール形式、送信失敗）がUIに反映されることを確認できる
- ブラウザで招待済みviewer一覧が表示され、取り消し操作が反映されることを確認できる
- 0件時の空状態、送信中・取り消し中のローディング状態、エラー時の表示を確認できる

## 3. 関連要件・関連設計

- **関連要件**: REQ-101, REQ-105, REQ-106, REQ-302, REQ-303, REQ-304
- **関連設計**: design.md §4.3

## 4. 依存関係

- **前提フェーズ**: Phase 4, Phase 5
- **ブロッカー**: なし

## 5. タスク一覧

- [ ] **TASK-7-01: フロントエンド - viewer招待フォーム実装（Red→Green）**
  - **タイプ**: TDD
  - **依存タスク**: Phase 4
  - **関連要件**: REQ-101, REQ-302, REQ-303, REQ-304
  - **関連設計**: design.md §4.3
  - **実装詳細**:
    - `app/client/src/features/viewer-management/components/ViewerInviteForm.tsx`と、`useProjectMutations.ts`と同様のパターンで`hooks/useInviteViewer.ts`を実装する
  - **完了条件**: フォームからの送信で招待APIが呼ばれ、成功・失敗それぞれがUIに反映される
  - **単体テスト要件**: 正常送信、バリデーションエラー（不正メール形式・自己招待）表示、送信中/送信失敗時のUI状態
  - **UI/UX要件**: 送信中のローディング状態、エラー表示（自己招待/不正メール形式/送信失敗のメッセージが判別できること）

- [ ] **TASK-7-02: フロントエンド - 招待済みviewer一覧・取り消しUI実装（Red→Green）**
  - **タイプ**: TDD
  - **依存タスク**: Phase 5
  - **関連要件**: REQ-105, REQ-106
  - **関連設計**: design.md §4.3
  - **実装詳細**:
    - `app/client/src/features/viewer-management/components/ViewerList.tsx`と`hooks/useProjectViewers.ts`（`useProjects.ts`と同様のパターン）、`hooks/useRevokeViewer.ts`（`useProjectMutations.ts`と同様のパターン）を実装する
  - **完了条件**: 招待済みviewer一覧が表示され、取り消し操作が反映される
  - **単体テスト要件**: 一覧表示（複数件・0件）、取り消し操作の成功・失敗
  - **UI/UX要件**: 0件時の空状態表示、取り消し操作の確認導線、取り消し中のローディング状態

- [ ] **TASK-7-03: project詳細画面への招待フォーム・一覧UIの組み込み（Red→Green）**
  - **タイプ**: TDD
  - **依存タスク**: TASK-7-01, TASK-7-02
  - **関連要件**: REQ-101, REQ-105, REQ-106
  - **関連設計**: design.md §4.3
  - **実装詳細**: `app/client/src/app/dashboard/projects/[id]/ProjectDetailClient.tsx`（project詳細画面）に、`ViewerInviteForm`と`ViewerList`を組み込む
  - **完了条件**: project詳細画面から招待・一覧確認・取り消しの一連の操作がブラウザで完結する
  - **単体テスト要件**: `ProjectDetailPage.test.tsx`に、viewer管理UIが表示されることの確認を追加する

## 6. このフェーズの完了条件

- project詳細画面から、viewerの招待・一覧確認・取り消しがブラウザで完結すること
- クライアント側の型チェックがエラーゼロであること
- 新規テスト・既存テストがすべてグリーンであること
