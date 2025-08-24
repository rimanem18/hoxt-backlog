# TDD Red Phase 設計書：TASK-201 認証エンドポイント

**作成日**: 2025-08-24  
**タスクID**: TASK-201  
**フェーズ**: 🔴 Red Phase 完了  
**次フェーズ**: 🟢 Green Phase 実装準備

## Red Phase 成果物

### 1. 統合テストファイル作成
**ファイル**: `app/server/src/presentation/http/routes/__tests__/authRoutes.integration.test.ts`
**行数**: 301行
**テストケース数**: 8項目

### 2. テスト構成詳細

#### 正常ケース（2項目）
1. **有効JWTでの認証成功テスト**
   - Content-Type: application/json
   - リクエスト: `{ token: "valid-jwt-token" }`
   - 期待値: 200 OK, `{ success: true, data: { user, isNewUser: false } }`

2. **新規ユーザーJITプロビジョニングテスト**
   - 初回ログインシナリオ
   - 期待値: `{ isNewUser: true }` フラグ確認

#### エラーケース（3項目）
3. **無効JWT検証テスト**
   - 不正トークン送信
   - 期待値: 401 Unauthorized, `INVALID_TOKEN` エラー

4. **リクエストボディなしテスト**
   - 空リクエスト送信
   - 期待値: 400 Bad Request, バリデーションエラー

5. **必須フィールド不存在テスト**
   - `token`フィールド欠如
   - 期待値: 400 Bad Request, `TOKEN_REQUIRED` エラー

#### 境界ケース（3項目）
6. **レスポンス時間検証テスト**
   - 1000ms以内レスポンス要件確認
   - NFR-002準拠

7. **CORS対応確認テスト**
   - プリフライトリクエスト処理
   - フロントエンド連携準備

8. **Content-Type検証テスト**
   - `application/json`以外拒否
   - 400 Bad Request期待

### 3. 失敗確認結果

#### 実行コマンド
```bash
docker compose exec server bun test app/server/src/presentation/http/routes/__tests__/authRoutes.integration.test.ts
```

#### 失敗出力
```
✗ 正常ケース: 有効なJWTで認証成功
✗ 正常ケース: 新規ユーザーのJITプロビジョニング  
✗ エラーケース: 無効なJWT
✗ エラーケース: リクエストボディなし
✗ エラーケース: tokenフィールドなし
✗ 境界ケース: レスポンス時間1000ms以内
✗ 境界ケース: CORS対応確認
✗ 境界ケース: Content-Type検証

TypeError: undefined is not an object (evaluating 'app.request')
```

#### 失敗原因
- **期待される失敗**: authRoutes.ts未実装
- **Honoアプリインスタンス未取得**: server/index.ts統合未完了
- **ルート未定義**: `/api/auth/verify`エンドポイント不存在

## Green Phase 実装設計

### 実装ファイル構成

#### 新規作成ファイル
1. **`app/server/src/presentation/http/routes/authRoutes.ts`**
   ```typescript
   // 設計パターン: greetRoutes.ts踏襲
   import { Hono } from 'hono';
   import { AuthController } from '@/presentation/http/controllers/AuthController';
   import { AuthenticateUserUseCase } from '@/application/auth/AuthenticateUserUseCase';
   
   const auth = new Hono();
   auth.post('/auth/verify', async (c) => {
     // 依存性注入とController呼び出し
   });
   export default auth;
   ```

#### 更新ファイル
2. **`app/server/src/presentation/http/routes/index.ts`**
   ```typescript
   // auth export追加
   export { default as auth } from './authRoutes';
   ```

3. **`app/server/src/presentation/http/server/index.ts`**
   ```typescript
   // authルートマウント追加
   import { greet, health, auth } from '../routes';
   app.route('/api', auth);
   ```

### 依存性注入設計

#### UseCase層
```typescript
const authUseCase = new AuthenticateUserUseCase(
  userRepository,    // IUserRepository具体実装
  authProvider       // SupabaseAuthProvider
);
```

#### Controller層
```typescript
const authController = new AuthController(authUseCase);
return await authController.verifyToken(c);
```

### エラーハンドリング設計

#### 既実装活用
- AuthController.verifyToken()内でエラー処理済み
- ResponseService統一形式対応済み
- HTTPステータスコード変換済み（401/400/500）

## 品質保証計画

### 実装後テスト戦略
1. **統合テスト**: 全8項目成功確認
2. **型チェック**: `bunx tsc --noEmit`
3. **既存テスト**: AuthController.test.ts（14項目）継続実行
4. **手動テスト**: HTTP POST `/api/auth/verify`動作確認

### 成功基準
- [ ] 統合テスト8項目全て成功
- [ ] TypeScript型エラーなし
- [ ] AuthController単体テスト14項目継続成功
- [ ] CORS設定動作確認
- [ ] レスポンス時間1000ms以内

## 実装推奨順序

### Step 1: 基本実装
1. authRoutes.ts作成（POST /auth/verify）
2. routes/index.ts auth export追加
3. server/index.ts auth mount追加

### Step 2: 依存性解決
1. AuthenticateUserUseCase注入方式確認
2. Repository/AuthProvider具体実装確認
3. AuthController呼び出し実装

### Step 3: 統合確認
1. 統合テスト1項目ずつ修正確認
2. 全項目成功まで調整
3. 既存テスト影響確認

## 次ステップ推奨

**🟢 Green Phase開始**: `/tdd-green`コマンドでGreen Phase実装開始

**実装スコープ**: HTTP エンドポイント統合（authRoutes + server統合）
**成功条件**: 統合テスト全8項目成功