# MVP Google認証の業務視点解説

作成日: 2025-08-12  
更新日: 2025-08-12

## 目次
1. [システムの業務目的と価値](#システムの業務目的と価値)
2. [業務の関係者と役割](#業務の関係者と役割)  
3. [業務手順とフロー](#業務手順とフロー)
4. [DDDでの考え方](#DDDでの考え方)
5. [層別実装解説](#層別実装解説)
6. [実装の進め方](#実装の進め方)

---

## システムの業務目的と価値

### なぜこのシステムを作るのか？
**「面倒な会員登録をなくして、お客さんがワンクリックでサービスを使い始められるようにしたい」**

これがこのシステムの最大の価値です。

### 解決したい課題
- **従来の問題**: 新規ユーザーは氏名・メールアドレス・パスワードを入力して面倒な会員登録が必要
- **解決方法**: Googleアカウントのボタンをクリックするだけで、すぐにサービスが使える

### ビジネス価値
- **新規ユーザーの離脱率削減**: 登録の手間で諦めるお客さんを減らす
- **コンバージョン率向上**: ワンクリックで始められるため、より多くの人がサービスを試す
- **サポートコスト削減**: パスワード忘れなどの問い合わせが激減

---

## 業務の関係者と役割

### 👤 アプリ利用者
- **やりたいこと**: サービスをすぐに使い始めたい
- **期待**: 面倒な入力なしで、安全にログインできる
- **行動**: Googleアカウントでワンクリックログイン

### 💻 フロントエンド（受付係の役割）
- **責任**: お客さんを適切に案内する
- **やること**: 
  - 「Googleでログイン」ボタンを表示
  - Google認証の手続きをサポート
  - お客さんの認証状態を管理

### 🏢 バックエンドAPI（事務処理部門の役割）
- **責任**: お客さんの身元確認とデータ管理
- **やること**:
  - Googleから受け取った身元証明書（JWT）の真偽を確認
  - 初回の方は「顧客台帳」に新規登録（JIT プロビジョニング）
  - リピーターの方は台帳から情報を取得

### 🔐 Supabase Auth（身元保証機関の役割）
- **責任**: Google認証の代行と身元証明書の発行
- **やること**: 
  - Googleとの認証やりとりを代行
  - 認証成功後、デジタル身元証明書（JWT）を発行

### 📊 PostgreSQL（顧客台帳の役割）
- **責任**: お客さんの基本情報を安全に保管
- **保管内容**: お客さんのID、名前、メールアドレス、プロフィール画像

---

## 業務手順とフロー

### 🏃‍♀️ 初回ユーザーの場合（新規顧客登録）

1. **お客さん**: 「Googleでログイン」ボタンをクリック
2. **フロントエンド**: Googleの認証ページにご案内
3. **Google**: 「このサービスがあなたの情報を使うことを許可しますか？」と確認
4. **お客さん**: 「許可する」をクリック
5. **Supabase**: Googleから情報を受け取り、身元証明書（JWT）を発行
6. **フロントエンド**: 身元証明書をバックエンドに提示
7. **バックエンド**: 身元証明書の真偽を確認
8. **バックエンド**: 初回なので「顧客台帳（DB）」に新規登録
9. **フロントエンド**: 「◯◯さん、ようこそ！」と表示

### 🔄 リピーターユーザーの場合（既存顧客確認）

1. **お客さん**: サービスにアクセス
2. **フロントエンド**: 「この人、前にも来たことがある？」をチェック
3. **フロントエンド**: 保存済みの身元証明書をバックエンドに提示
4. **バックエンド**: 身元証明書が有効であることを確認
5. **バックエンド**: 「顧客台帳」から情報を取得
6. **フロントエンド**: 「おかえりなさい、◯◯さん！」と表示

---

## DDDでの考え方

### ドメイン（業務領域）の特定
**「お客さんの身元確認と顧客管理」** がこのシステムの核となる業務領域です。

#### 境界づけられたコンテキスト
- **認証コンテキスト**: 「この人は本当にその人なのか？」を確認する業務
- **ユーザー管理コンテキスト**: 「お客さんの基本情報を管理する」業務

### エンティティ（業務の主役）
#### User（顧客）
お客さん一人ひとりを表現する、このシステムの主役です。
```typescript
// 顧客の基本情報
interface User {
  id: string;           // 台帳管理番号
  name: string;         // お客さんの名前
  email: string;        // 連絡先
  provider: string;     // どこで身元確認したか（Google/Apple等）
  externalId: string;   // 身元確認機関での番号
}
```

#### なぜこの設計なのか？
- **id**: 社内管理用の一意番号（お客さんが身元確認機関を変更しても変わらない）
- **externalId**: Google側での顧客番号（Googleが管理する番号）
- **provider**: 将来Apple、Microsoft等にも対応できるよう記録

### 集約（Aggregate）
#### UserAggregate（顧客管理の責任者）
「お客さん一人の情報に関するすべての業務ルール」を管理します。

```typescript
class UserAggregate {
  /**
   * 新規顧客登録時のビジネスルールを管理
   * 
   * なぜ必要？
   * - メールアドレスの形式チェック
   * - 同じお客さんが重複登録されないかチェック
   * - 必要最小限の情報のみ保存（プライバシー保護）
   */
  static createFromOAuth(info: ExternalUserInfo): User {
    // ビジネスルールの検証
    if (!this.isValidEmail(info.email)) {
      throw new Error('有効なメールアドレスではありません');
    }
    
    if (!this.isValidName(info.name)) {
      throw new Error('名前が入力されていません');
    }
    
    // 新規顧客情報の生成
    return new User({
      id: generateNewId(),
      email: info.email,
      name: info.name,
      // その他の業務ルール適用
    });
  }
}
```

### リポジトリ（顧客台帳管理）
#### UserRepository
「顧客台帳の管理方法」を抽象化します。

```typescript
interface IUserRepository {
  /**
   * 身元確認機関の顧客番号で検索
   * 
   * 業務的な意味: 
   * 「Google番号123の人、うちの台帳にいる？」
   */
  findByExternalId(externalId: string, provider: string): Promise<User | null>;
  
  /**
   * 新規顧客の台帳への登録
   * 
   * 業務的な意味:
   * 「新しいお客さんの情報を台帳に記録してください」
   */
  create(user: CreateUserInput): Promise<User>;
}
```

#### なぜ抽象化するのか？
今はPostgreSQLですが、将来的に以下のような変更があっても、業務ロジックは変更不要：
- MongoDB に変更
- 複数DBの併用
- クラウドサービスへの移行

---

## 層別実装解説

### 📋 Presentation層（受付窓口）
**役割**: お客さんとのやりとりを担当

#### AuthController
```typescript
/**
 * 認証関連の受付窓口
 * 
 * 業務的な役割: 身元証明書の受付・確認業務
 */
export class AuthController {
  /**
   * 身元証明書の検証受付
   * 
   * 業務フロー:
   * 1. お客さんから身元証明書（JWT）を受け取る
   * 2. 事務処理部門（UseCase）に検証を依頼
   * 3. 結果をお客さんに返す
   */
  async verifyToken(request: Request): Promise<Response> {
    try {
      const { token } = request.body;
      
      // 事務処理部門に身元確認を依頼
      const result = await this.authenticateUserUseCase.execute({ jwt: token });
      
      // お客さんに結果を報告
      return {
        success: true,
        data: {
          user: result.user,
          isNewUser: result.isNewUser
        }
      };
    } catch (error) {
      // エラーが起きた場合の対応
      return {
        success: false,
        error: {
          message: '身元確認に失敗しました'
        }
      };
    }
  }
}
```

#### よくあるミス
❌ **Controllerにビジネスロジックを書く**
```typescript
// これはダメ！受付係が事務処理をしてしまっている
async verifyToken(request: Request) {
  const user = await database.findUser(token.sub); // ❌
  if (!user) {
    user = await database.createUser({...}); // ❌
  }
}
```

✅ **Controllerは受付だけ**
```typescript
// これが正解！受付係は事務処理部門に依頼するだけ
async verifyToken(request: Request) {
  const result = await this.useCase.execute(input); // ✅
  return this.formatResponse(result);
}
```

### 🏢 Application層（事務処理部門）
**役割**: 業務フローの実行・調整

#### AuthenticateUserUseCase
```typescript
/**
 * 「お客さんの身元確認」という業務手順を管理
 * 
 * 業務フロー:
 * 1. 身元証明書の真偽確認
 * 2. お客さんが既存顧客か新規顧客かを判断  
 * 3. 必要に応じて新規顧客登録
 * 4. 結果を返す
 */
export class AuthenticateUserUseCase {
  constructor(
    private userRepository: IUserRepository,     // 顧客台帳担当
    private authProvider: IAuthProvider          // 身元確認機関との連絡窓口
  ) {}
  
  /**
   * 身元確認業務の実行
   */
  async execute(input: { jwt: string }): Promise<AuthenticateUserUseCaseOutput> {
    // 1. 身元証明書の真偽確認
    const verifyResult = await this.authProvider.verifyToken(input.jwt);
    if (!verifyResult.valid) {
      throw new AuthenticationError('身元証明書が無効です');
    }
    
    // 2. 顧客情報の抽出
    const externalInfo = await this.authProvider.getExternalUserInfo(verifyResult.payload);
    
    // 3. 既存顧客の確認
    let user = await this.userRepository.findByExternalId(
      externalInfo.id, 
      externalInfo.provider
    );
    
    let isNewUser = false;
    
    // 4. 新規顧客の場合は登録
    if (!user) {
      // ドメインの専門知識を使って新規顧客情報を作成
      const userAggregate = UserAggregate.createFromOAuth(externalInfo);
      user = await this.userRepository.create(userAggregate.toCreateInput());
      isNewUser = true;
    }
    
    // 5. 最終ログイン日時を更新
    await this.userRepository.update(user.id, { 
      lastLoginAt: new Date() 
    });
    
    return { user, isNewUser };
  }
}
```

#### なぜUseCaseが必要？
- **業務フローの明確化**: 「身元確認」という業務手順が一目でわかる
- **変更の局所化**: 認証の手順が変わってもここだけ修正すれば済む
- **テストのしやすさ**: 業務フロー全体をテストできる

### 💼 Domain層（業務の専門知識）
**役割**: ビジネスルール・制約の管理

#### User Entity
```typescript
/**
 * お客さん一人を表現するエンティティ
 * 
 * 業務的な意味: 「顧客台帳の1レコード」に相当
 * 
 * なぜエンティティなのか？
 * - 一意のIDを持つ（同じお客さんは世界に一人だけ）  
 * - 時間と共に状態が変化する（名前変更、ログイン履歴等）
 * - ビジネスルールを内包する（メール形式チェック等）
 */
export class User {
  private constructor(
    private _id: string,
    private _externalId: string, 
    private _provider: AuthProvider,
    private _email: string,
    private _name: string,
    private _avatarUrl?: string,
    private _createdAt: Date = new Date(),
    private _updatedAt: Date = new Date(),
    private _lastLoginAt?: Date
  ) {
    // 不変条件のチェック
    this.validateEmail(_email);
    this.validateName(_name);
  }
  
  /**
   * メールアドレスの妥当性検証
   * 
   * なぜここにあるのか？
   * 「有効なメールアドレスでなければお客さんとして認められない」
   * これはビジネスルールなので、Domainに配置
   */
  private validateEmail(email: string): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new InvalidEmailError('有効なメールアドレスではありません');
    }
  }
  
  /**
   * 最終ログイン日時の更新
   * 
   * なぜメソッドにするのか？
   * - 単純な setter だと、いつ・なぜ更新されるかわからない
   * - メソッドにすることで「ログインした」という業務的意味を表現
   */
  updateLastLogin(): void {
    this._lastLoginAt = new Date();
    this._updatedAt = new Date();
    
    // 将来的にはドメインイベントを発行する可能性
    // DomainEvents.raise(new UserLoggedInEvent(this._id));
  }
  
  // ゲッターは省略...
}
```

#### UserAggregate
```typescript
/**
 * ユーザー関連のビジネスルールを一元管理
 * 
 * 業務的な役割: 「顧客管理業務の責任者」
 */
export class UserAggregate {
  /**
   * OAuth情報から新規顧客を作成
   * 
   * このメソッドに集約されるビジネスルール:
   * 1. 重複チェック（呼び出し元で実施前提）
   * 2. 必要最小限の情報のみ保存（プライバシー保護）
   * 3. デフォルト値の設定
   * 4. 形式チェック
   */
  static createFromOAuth(externalInfo: ExternalUserInfo): User {
    // プライバシー保護: アバターURLの検証
    const safeAvatarUrl = this.sanitizeAvatarUrl(externalInfo.avatarUrl);
    
    // デフォルト値の適用
    const displayName = externalInfo.name || this.generateDisplayName(externalInfo.email);
    
    return User.create({
      externalId: externalInfo.id,
      provider: externalInfo.provider,
      email: externalInfo.email,
      name: displayName,
      avatarUrl: safeAvatarUrl
    });
  }
  
  /**
   * アバターURLの安全性確認
   * 
   * なぜ必要？
   * - 悪意のあるURLからの画像読み込みを防ぐ
   * - HTTPSでない画像の除外
   * - 適切なドメインからの画像のみ許可
   */
  private static sanitizeAvatarUrl(url?: string): string | undefined {
    if (!url) return undefined;
    
    // HTTPSでない画像は除外
    if (!url.startsWith('https://')) return undefined;
    
    // 信頼できるドメインからの画像のみ許可
    const trustedDomains = [
      'lh3.googleusercontent.com',  // Google
      'avatars.githubusercontent.com', // GitHub (将来対応)
      // 他の信頼できるドメインを追加
    ];
    
    const domain = new URL(url).hostname;
    return trustedDomains.includes(domain) ? url : undefined;
  }
}
```

#### よくあるミス：Anemic Domain Model（貧血ドメインモデル）
❌ **データの入れ物だけのエンティティ**
```typescript
// これはダメ！単なるデータの入れ物になっている
class User {
  id: string;
  email: string;
  name: string;
  // ビジネスロジックが一切ない
}

// ビジネスロジックがServiceに散らばってしまう
class UserService {
  validateEmail(email: string) { /* ... */ } // ❌
  updateLastLogin(user: User) { /* ... */ }  // ❌
}
```

✅ **ビジネスロジックを内包するリッチなエンティティ**
```typescript
// これが正解！エンティティ自身がビジネスルールを知っている
class User {
  private validateEmail() { /* ... */ }  // ✅
  updateLastLogin() { /* ... */ }         // ✅
  
  // 自分のことは自分で管理
}
```

### 🔌 Infrastructure層（外部システム連携）
**役割**: 外部システムとの具体的な連携処理

#### PostgreSQLUserRepository
```typescript
/**
 * PostgreSQL顧客台帳の具体的な管理方法
 * 
 * 業務的な役割: 「台帳管理システムの操作担当」
 * 
 * なぜ必要？
 * - ドメイン層は「台帳に保存する」ことだけ知っていればいい
 * - 「PostgreSQLのどのテーブルに、どんなSQLで」は関心事ではない
 * - データベースが変わってもドメインロジックは影響を受けない
 */
export class PostgreSQLUserRepository implements IUserRepository {
  constructor(private db: Database) {}
  
  /**
   * 身元確認機関の番号で顧客検索
   * 
   * SQL的な処理をドメイン概念に変換
   */
  async findByExternalId(externalId: string, provider: AuthProvider): Promise<User | null> {
    // SQLクエリの実行（技術的関心事）
    const row = await this.db.query(
      `SELECT * FROM ${this.getTableName()} 
       WHERE external_id = $1 AND provider = $2`,
      [externalId, provider]
    );
    
    if (!row) return null;
    
    // データベースの行データをDomainオブジェクトに変換
    return this.rowToUser(row);
  }
  
  /**
   * 新規顧客の台帳登録
   */
  async create(input: CreateUserInput): Promise<User> {
    // ドメインオブジェクトをSQL用データに変換
    const data = this.userToRow(input);
    
    // SQL実行
    const row = await this.db.query(
      `INSERT INTO ${this.getTableName()} 
       (id, external_id, provider, email, name, avatar_url, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [data.id, data.external_id, data.provider, data.email, data.name, 
       data.avatar_url, data.created_at, data.updated_at]
    );
    
    return this.rowToUser(row);
  }
  
  /**
   * 環境変数に応じたテーブル名の動的生成
   * 
   * なぜ必要？
   * - 開発環境: dev_users
   * - 本番環境: prod_users  
   * - テスト環境: test_users
   */
  private getTableName(): string {
    const prefix = process.env.DB_TABLE_PREFIX || '';
    return `${prefix}users`;
  }
  
  /**
   * データベース行データをドメインオブジェクトに変換
   * 
   * なぜ必要？
   * - データベースのカラム名（snake_case）
   * - ドメインオブジェクトのプロパティ名（camelCase）
   * - 型の変換（string → Date等）
   */
  private rowToUser(row: any): User {
    return User.reconstruct({
      id: row.id,
      externalId: row.external_id,      // snake_case → camelCase
      provider: row.provider,
      email: row.email,
      name: row.name,
      avatarUrl: row.avatar_url,
      createdAt: new Date(row.created_at), // string → Date
      updatedAt: new Date(row.updated_at),
      lastLoginAt: row.last_login_at ? new Date(row.last_login_at) : undefined
    });
  }
}
```

#### SupabaseAuthProvider
```typescript
/**
 * Supabase身元確認機関との連携担当
 * 
 * 業務的な役割: 「身元確認機関の窓口担当」
 */
export class SupabaseAuthProvider implements IAuthProvider {
  /**
   * 身元証明書（JWT）の真偽確認
   * 
   * 技術的な処理:
   * 1. JWTの署名検証
   * 2. 有効期限チェック
   * 3. 発行者（iss）の確認
   */
  async verifyToken(token: string): Promise<JwtVerificationResult> {
    try {
      // Supabase秘密鍵での署名検証
      const payload = jwt.verify(token, this.jwtSecret) as JwtPayload;
      
      // 発行者チェック
      if (payload.iss !== this.expectedIssuer) {
        throw new Error('不正な発行者です');
      }
      
      return {
        valid: true,
        payload: payload
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }
  
  /**
   * 身元証明書から顧客情報を抽出
   */
  async getExternalUserInfo(payload: JwtPayload): Promise<ExternalUserInfo> {
    // JWTペイロードからドメインで必要な情報を抽出
    return {
      id: payload.sub,                                    // Google顧客番号
      provider: this.mapProvider(payload.app_metadata.provider),  // 'google'
      email: payload.email,                               // メールアドレス
      name: payload.user_metadata.full_name || payload.user_metadata.name,  // 表示名
      avatarUrl: payload.user_metadata.avatar_url         // プロフィール画像
    };
  }
}
```

---

## 実装の進め方

### 📝 ステップ1: Domain層から開始（内側から外側へ）

#### 1-1. エンティティの実装
```typescript
// app/server/src/domain/entities/UserEntity.ts
export class UserEntity {
  // What: ユーザーエンティティの基本属性とビジネスルールを管理
  // Why: ユーザーの不変条件を保証し、ビジネスロジックを集約するため
}
```

#### 1-2. リポジトリインターフェースの定義
```typescript
// app/server/src/domain/repositories/IUserRepository.ts
export interface IUserRepository {
  // What: ユーザーデータ永続化の抽象化
  // Why: ドメインロジックをインフラストラクチャから分離するため
}
```

#### よくあるミス
❌ **データベーステーブル設計から始める**
→ 技術的制約に引っ張られて、ビジネスロジックが歪む

✅ **ドメインモデル設計から始める**  
→ ビジネスルールを正しく表現してから、技術的な実装を考える

### ⚙️ ステップ2: Application層（Use Cases）

#### 2-1. Use Caseの実装
```typescript
// app/server/src/application/usecases/AuthenticateUserUseCase.ts
export class AuthenticateUserUseCase {
  /**
   * What: JWT検証からユーザー認証・JITプロビジョニングまでの業務フロー
   * Why: 認証に関する複雑な業務ロジックを一箇所で管理するため
   */
  async execute(input: AuthenticateUserUseCaseInput): Promise<AuthenticateUserUseCaseOutput> {
    // 1. JWT検証
    // 2. ユーザー存在確認  
    // 3. 必要に応じてJITプロビジョニング
    // 4. ログイン履歴更新
  }
}
```

### 🔌 ステップ3: Infrastructure層（外部システム連携）

#### 3-1. データベース実装
```typescript
// app/server/src/infrastructure/repositories/PostgreSQLUserRepository.ts
export class PostgreSQLUserRepository implements IUserRepository {
  /**
   * What: PostgreSQLを使ったユーザーデータ永続化の具体実装
   * Why: ドメインの抽象化を具体的なデータベース操作に変換するため
   */
}
```

#### 3-2. 外部サービス連携
```typescript
// app/server/src/infrastructure/auth/SupabaseAuthProvider.ts
export class SupabaseAuthProvider implements IAuthProvider {
  /**
   * What: SupabaseでのJWT検証・ユーザー情報取得の具体実装
   * Why: 外部認証サービスの技術仕様をドメインロジックから分離するため
   */
}
```

### 🌐 ステップ4: Presentation層（API実装）

#### 4-1. コントローラーの実装
```typescript
// app/server/src/presentation/controllers/AuthController.ts
export class AuthController {
  /**
   * What: HTTP認証リクエストの受付・レスポンス変換
   * Why: HTTPの技術詳細をアプリケーション層から隠蔽するため
   */
  async verifyToken(request: Request): Promise<Response> {
    // HTTPリクエスト → Use Case入力に変換
    // Use Case実行
    // Use Case出力 → HTTPレスポンスに変換
  }
}
```

### 🧪 ステップ5: テスト実装

#### 5-1. 単体テスト（内側から）
```typescript
// tests/domain/entities/User.test.ts
describe('User Entity', () => {
  test('有効なメールアドレスでユーザーを作成できる', () => {
    // What: メールアドレス検証ロジックのテスト
    // Why: ビジネスルールが正しく実装されているか確認するため
  });
  
  test('無効なメールアドレスでエラーになる', () => {
    // Why: 不正なデータでの登録を防げているか確認するため
  });
});
```

#### 5-2. 統合テスト（外側から）
```typescript
// tests/application/usecases/AuthenticateUserUseCase.test.ts
describe('AuthenticateUserUseCase', () => {
  test('初回ユーザーのJITプロビジョニングが成功する', () => {
    // What: 認証からユーザー作成までの業務フロー全体のテスト
    // Why: Use Case全体が期待通りに動作することを確認するため
  });
});
```

### 🚀 ステップ6: 依存性注入・起動設定

#### 6-1. DIコンテナ設定
```typescript
// app/server/src/infrastructure/di/Container.ts
export class DIContainer {
  /**
   * What: 依存性注入の設定・管理
   * Why: 各層間の依存関係を適切に解決するため
   */
  register() {
    // Repository実装の注入
    this.container.bind<IUserRepository>(TYPES.UserRepository)
              .to(PostgreSQLUserRepository);
    
    // AuthProvider実装の注入  
    this.container.bind<IAuthProvider>(TYPES.AuthProvider)
              .to(SupabaseAuthProvider);
              
    // UseCase の注入
    this.container.bind<IAuthenticateUserUseCase>(TYPES.AuthenticateUserUseCase)
              .to(AuthenticateUserUseCase);
  }
}
```

---

## まとめ：DDDで得られる価値

### 🎯 ビジネス価値
1. **要件変更への強さ**: 「Apple認証も対応して」→ 新しいAuthProviderを追加するだけ
2. **品質の向上**: ビジネスルールが一箇所に集約され、漏れやミスが減る
3. **開発効率**: 各層の責務が明確で、担当者が並行して開発できる

### 🛠 技術的価値  
1. **保守性**: 「PostgreSQL → MongoDB」「Supabase → Auth0」などの変更が容易
2. **テスタビリティ**: 各層を独立してテストできる
3. **拡張性**: 新機能追加時の影響範囲が予測しやすい

### 👥 チーム開発での価値
1. **コミュニケーション**: ビジネス担当者と開発者が同じ言葉で話せる
2. **知識共有**: ドメインの知識がコードに表現され、属人化が防げる
3. **レビュー効率**: 各層の責務が明確なため、レビューポイントが明確

DDDは単なる技術パターンではなく、「ソフトウェアでビジネス価値を正しく表現する」ための考え方です。このMVPで基礎を身につけ、より複雑なドメインにも適用できるようになりましょう。
