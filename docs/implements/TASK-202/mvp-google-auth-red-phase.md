# TDD Red Phase 設計書：TASK-202 ユーザーコントローラー実装

**作成日**: 2025-08-25  
**タスクID**: TASK-202  
**フェーズ**: 🔴 Red Phase 完了  
**次フェーズ**: 🟢 Green Phase 実装準備

## Red Phase 成果物

### 1. テストファイル作成完了

#### UserController単体テスト
**ファイル**: `app/server/src/presentation/http/controllers/__tests__/UserController.test.ts`
**行数**: 232行
**テストケース数**: 11項目

#### HTTP統合テスト
**ファイル**: `app/server/src/presentation/http/routes/__tests__/userRoutes.integration.test.ts`
**行数**: 296行
**テストケース数**: 11項目

### 2. テスト構成詳細

#### 正常ケース（3項目）
1. **認証済みユーザーのプロフィール取得成功テスト**
   - AuthMiddleware経由でuserIdが設定済みの前提
   - 期待値: 200 OK, `{ success: true, data: { user } }`

2. **プロフィール取得パフォーマンステスト**
   - NFR-002準拠：500ms以内レスポンス要件確認
   - 処理時間測定とパフォーマンス要件達成確認

3. **CORS対応確認テスト**
   - プリフライトリクエスト処理
   - フロントエンド連携準備確認

#### エラーケース（4項目）
4. **認証必要エラーテスト**
   - AuthMiddlewareでuserIdが未設定の場合
   - 期待値: 401 Unauthorized, `AUTHENTICATION_REQUIRED`

5. **ユーザー未存在エラーテスト**
   - GetUserProfileUseCaseがUserNotFoundErrorをスロー
   - 期待値: 404 Not Found, `USER_NOT_FOUND`

6. **サーバー内部エラーテスト**
   - InfrastructureError発生時の適切な処理
   - 期待値: 500 Internal Server Error, `INTERNAL_SERVER_ERROR`

7. **無効JWTエラーテスト**
   - 無効・期限切れトークンでの認証失敗
   - 期待値: 401 Unauthorized, `AUTHENTICATION_REQUIRED`

#### 境界値ケース（4項目）
8. **JWTトークン期限切れテスト**
   - 期限切れトークンでの認証エラー処理確認

9. **同時リクエスト処理テスト**
   - 100リクエスト/分の負荷テスト
   - 同時処理でのデータ整合性確認

10. **大量データレスポンステスト**
    - 大きなユーザーデータでのパフォーマンス確認

11. **HTTPメソッド制限テスト**
    - POSTメソッドでMethod Not Allowedエラー確認
    - 期待値: 405 Method Not Allowed

### 3. 失敗確認結果

#### 実行コマンド
```bash
# UserController単体テスト
docker compose exec server bun test src/presentation/http/controllers/__tests__/UserController.test.ts

# HTTP統合テスト
docker compose exec server bun test src/presentation/http/routes/__tests__/userRoutes.integration.test.ts
```

#### 失敗出力

##### UserController単体テスト
```
✗ Cannot find module '@/domain/shared/errors/InfrastructureError'
✗ Cannot find module '@/application/interfaces/IGetUserProfileUseCase'
✗ UserController class not found
✗ GetUserProfileResponse type not found

# Unhandled error between tests
error: Cannot find module '@/domain/shared/errors/InfrastructureError'

0 pass
1 fail
1 error
```

##### HTTP統合テスト
```
✗ Cannot find module '../userRoutes'
✗ userRoutes.ts not found
✗ GET /api/user/profile endpoint not implemented

# Unhandled error between tests
error: Cannot find module '../userRoutes'

0 pass
1 fail
1 error
```

#### 失敗原因
- **期待される失敗**: UserController未実装
- **依存クラス未実装**: 必要なエラークラス・インターフェース不存在
- **ルート未定義**: `/api/user/profile`エンドポイント不存在
- **型定義不足**: GetUserProfileResponse型定義未実装

## Green Phase 実装設計

### 実装ファイル構成

#### 新規作成ファイル
1. **`app/server/src/presentation/http/controllers/UserController.ts`**
   ```typescript
   // 設計パターン: AuthController.ts踏襲
   import { Context } from 'hono';
   import { IGetUserProfileUseCase } from '@/application/interfaces/IGetUserProfileUseCase';
   
   export class UserController {
     constructor(private getUserProfileUseCase: IGetUserProfileUseCase) {}
     
     async getProfile(c: Context) {
       // 依存性注入とUseCase呼び出し
       // エラーハンドリング（認証・ユーザー未存在・内部エラー）
     }
   }
   ```

2. **`app/server/src/presentation/http/routes/userRoutes.ts`**
   ```typescript
   // 設計パターン: authRoutes.ts踏襲
   import { Hono } from 'hono';
   import { UserController } from '@/presentation/http/controllers/UserController';
   import { GetUserProfileUseCase } from '@/application/usecases/GetUserProfileUseCase';
   
   const user = new Hono();
   user.get('/user/profile', async (c) => {
     // 依存性注入とController呼び出し
   });
   export default user;
   ```

3. **`app/server/src/application/interfaces/IGetUserProfileUseCase.ts`**
   ```typescript
   // 既存のGetUserProfileUseCaseからインターフェースを抽出
   export interface IGetUserProfileUseCase {
     execute(input: GetUserProfileUseCaseInput): Promise<GetUserProfileUseCaseOutput>;
   }
   ```

4. **`app/server/src/domain/shared/errors/InfrastructureError.ts`**
   ```typescript
   // 既存のUserNotFoundErrorパターン踏襲
   export class InfrastructureError extends Error {
     constructor(message: string) {
       super(message);
       this.name = 'InfrastructureError';
     }
   }
   ```

#### 更新ファイル
5. **`app/server/src/presentation/http/routes/index.ts`**
   ```typescript
   // user export追加
   export { default as user } from './userRoutes';
   ```

6. **`app/server/src/presentation/http/server/index.ts`**
   ```typescript
   // userルートマウント追加
   import { greet, health, auth, user } from '../routes';
   app.route('/api', user);
   ```

7. **`app/packages/shared-schemas/src/api.ts`**
   ```typescript
   // GetUserProfileResponse型定義追加
   export interface GetUserProfileResponse {
     success: true;
     data: {
       id: string;
       externalId: string;
       provider: string;
       email: string;
       name: string;
       avatarUrl: string | null;
       createdAt: string;
       updatedAt: string;
       lastLoginAt: string | null;
     };
   }
   ```

### 依存性注入設計

#### UseCase層
```typescript
const getUserProfileUseCase = new GetUserProfileUseCase(
  userRepository    // 既存のIUserRepository実装
);
```

#### Controller層
```typescript
const userController = new UserController(getUserProfileUseCase);
return await userController.getProfile(c);
```

### エラーハンドリング設計

#### 認証エラー処理
- AuthMiddleware未実装のため、仮想的な認証チェック実装
- `c.get('authUser')`でuserIdを取得、未設定時は401エラー

#### 既実装活用
- GetUserProfileUseCase内でエラー処理済み
- UserNotFoundError、ValidationError の適切なHTTP変換

## 品質保証計画

### 実装後テスト戦略
1. **単体テスト**: UserController 11項目成功確認
2. **統合テスト**: HTTP userRoutes 11項目成功確認
3. **型チェック**: `bunx tsc --noEmit`
4. **既存テスト**: GetUserProfileUseCase.test.ts 継続実行
5. **手動テスト**: HTTP GET `/api/user/profile`動作確認

### 成功基準
- [ ] UserController単体テスト11項目全て成功
- [ ] HTTP統合テスト11項目全て成功
- [ ] TypeScript型エラーなし
- [ ] GetUserProfileUseCase単体テスト継続成功
- [ ] CORS設定動作確認
- [ ] レスポンス時間500ms以内
- [ ] エラーハンドリング適切な動作

## 実装推奨順序

### Step 1: 基盤実装
1. InfrastructureError.ts作成
2. IGetUserProfileUseCase.ts作成
3. GetUserProfileResponse型定義追加（shared-schemas）

### Step 2: Controller実装
1. UserController.ts作成（基本機能）
2. エラーハンドリング実装
3. CORS ヘッダー設定実装

### Step 3: ルーティング実装
1. userRoutes.ts作成（GET /user/profile）
2. routes/index.ts user export追加
3. server/index.ts user mount追加

### Step 4: 統合確認
1. 単体テスト1項目ずつ修正確認
2. 統合テスト1項目ずつ修正確認
3. 全項目成功まで調整
4. 既存テスト影響確認

## 次ステップ推奨

**🟢 Green Phase開始**: `/tdd-green`コマンドでGreen Phase実装開始

**実装スコープ**: UserController + userRoutes + 依存関係実装  
**成功条件**: 単体テスト・統合テスト 全22項目成功