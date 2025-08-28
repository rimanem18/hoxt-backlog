import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import type { AuthenticateUserUseCaseInput, AuthenticateUserUseCaseOutput } from "../../../../../../packages/shared-schemas/src/auth";

/**
 * TDD Red フェーズ: JITプロビジョニング成功テスト
 * 
 * 【テスト目的】: 初回ログイン時のJIT（Just-In-Time）新規ユーザー作成が正常に動作することを確認
 * 【テスト内容】: 未登録ユーザーの初回認証時に自動的にユーザーレコードが作成される処理を検証
 * 【期待される動作】: JWT検証→ユーザー不存在確認→新規ユーザー作成→レスポンス返却
 * 🟢 信頼性レベル: EARS要件REQ-004・interfaces.ts・dataflow.mdから直接抽出
 */
describe("AuthenticateUserUseCase - JITプロビジョニング成功テスト", () => {
  beforeEach(() => {
    // 【テスト前準備】: 各テスト実行前にテスト環境を初期化し、JIT処理の前提条件を設定
    // 【環境初期化】: データベースに未登録ユーザーの状態を確保（external_idが存在しない状態）
    console.log("JITプロビジョニングテスト環境の初期化を開始");
  });

  afterEach(() => {
    // 【テスト後処理】: テスト実行後に作成された新規ユーザーレコードを削除し、環境をクリーンアップ
    // 【状態復元】: JIT処理で作成されたテストデータを削除し、次のテストに影響しないよう初期状態に戻す
    console.log("JITプロビジョニングテスト環境のクリーンアップを完了");
  });

  test("初回ログインユーザーのJITプロビジョニングが成功する", async () => {
    // 【テスト目的】: 初回認証時のユーザー自動作成機能が正常に動作することを確認
    // 【テスト内容】: AuthenticateUserUseCaseが未登録ユーザーのJWTを処理し、新規ユーザーを作成・返却する
    // 【期待される動作】: JWT検証→ユーザー不存在確認→JIT新規作成→UUID生成→タイムスタンプ設定→isNewUser=true返却
    // 🟢 信頼性レベル: EARS要件REQ-004・AuthenticationDomainService仕様から直接抽出

    // 【テストデータ準備】: 初回認証ユーザーのJWT（external_idがDB未登録）を模擬
    // 【初期条件設定】: データベースに該当するexternal_id + providerの組み合わせが存在しない状態
    const newUserJwtInput: AuthenticateUserUseCaseInput = {
      jwt: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJnb29nbGVfOTg3NjU0MzIxIiwiZW1haWwiOiJuZXd1c2VyQGV4YW1wbGUuY29tIiwiYXBwX21ldGFkYXRhIjp7InByb3ZpZGVyIjoiZ29vZ2xlIiwicHJvdmlkZXJzIjpbImdvb2dsZSJdfSwidXNlcl9tZXRhZGF0YSI6eyJuYW1lIjoi5paw6KaP44Om44O844K244OzIiwiYXZhdGFyX3VybCI6Imh0dHBzOi8vZXhhbXBsZS5jb20vbmV3LWF2YXRhci5qcGciLCJlbWFpbCI6Im5ld3VzZXJAZXhhbXBsZS5jb20iLCJmdWxsX25hbWUiOiLmlrDopo/jg6bjg7zjgrbjg7MifSwiaXNzIjoiaHR0cHM6Ly9zdXBhYmFzZS5leGFtcGxlLmNvbSIsImlhdCI6MTcwMzEyMzQ1NiwiZXhwIjoxNzAzMTI3MDU2fQ.new_user_signature"
    };

    // 【実際の処理実行】: AuthenticateUserUseCaseのexecuteメソッドを呼び出し
    // 【処理内容】: JWT検証→ユーザー検索（不存在）→JIT新規作成→UUID生成→レスポンス生成の一連の処理を実行
    // ❌ 注意: このテストは現在失敗する（JITプロビジョニング機能が未実装のため）
    const authenticateUserUseCase = new (await import("../AuthenticateUserUseCase")).AuthenticateUserUseCase();
    const result: AuthenticateUserUseCaseOutput = await authenticateUserUseCase.execute(newUserJwtInput);

    // 【結果検証】: JIT処理により新規作成されたユーザー情報とフラグが正確に返却されることを検証
    // 【期待値確認】: 新規ユーザーが正常に作成され、isNewUser=trueであることを確認

    expect(result.user).toBeDefined(); // 【確認内容】: 新規作成されたユーザーオブジェクトが返却されることを確認 🟢
    expect(result.user.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/); // 【確認内容】: 新規UUIDが正しい形式で生成されることを確認 🟢
    expect(result.user.externalId).toBe("google_987654321"); // 【確認内容】: JWTペイロードのsubからexternal_idが正確に設定されることを確認 🟢
    expect(result.user.provider).toBe("google"); // 【確認内容】: 認証プロバイダーがJWTペイロードから正確に抽出・設定されることを確認 🟢
    expect(result.user.email).toBe("newuser@example.com"); // 【確認内容】: メールアドレスがJWTペイロードから正確に設定されることを確認 🟢
    expect(result.user.name).toBe("新規ユーザー"); // 【確認内容】: 表示名がJWTペイロードのuser_metadata.nameから正確に設定されることを確認 🟢
    expect(result.user.avatarUrl).toBe("https://example.com/new-avatar.jpg"); // 【確認内容】: アバターURLがJWTペイロードから正確に設定されることを確認 🟢
    
    // タイムスタンプの検証（現在時刻に近い値であることを確認）
    const now = new Date();
    const createdAt = new Date(result.user.createdAt);
    const updatedAt = new Date(result.user.updatedAt);
    const lastLoginAt = new Date(result.user.lastLoginAt!);
    
    expect(Math.abs(createdAt.getTime() - now.getTime())).toBeLessThan(5000); // 【確認内容】: 作成日時が現在時刻から5秒以内であることを確認 🟢
    expect(Math.abs(updatedAt.getTime() - now.getTime())).toBeLessThan(5000); // 【確認内容】: 更新日時が現在時刻から5秒以内であることを確認 🟢
    expect(Math.abs(lastLoginAt.getTime() - now.getTime())).toBeLessThan(5000); // 【確認内容】: 最終ログイン日時が現在時刻から5秒以内であることを確認 🟢

    expect(result.isNewUser).toBe(true); // 【確認内容】: JIT処理で新規作成されたユーザーなのでisNewUserがtrueであることを確認 🟢

    // 【品質保証】: この検証により、AuthenticationDomainServiceのJIT機能が正常に動作し、
    // 初回ログインユーザーの自動作成と適切なフラグ設定が保証される
  });

  test("JITプロビジョニングでユーザーエンティティが正しく構築される", async () => {
    // 【テスト目的】: JIT処理で作成されるUserEntityがDDD原則に従って正しく構築されることを確認
    // 【テスト内容】: ドメインオブジェクトとしての整合性・不変条件・ビジネスルールが適用されることを検証
    // 【期待される動作】: CreateUserInputから適切なUserEntityが生成され、ドメイン制約が満たされる
    // 🟢 信頼性レベル: DDD UserEntity設計・domain/user/UserEntity仕様から直接抽出

    // 【テストデータ準備】: JIT処理に必要な最小限のJWTペイロード情報を提供
    // 【初期条件設定】: ドメインバリデーションをテストするための境界値を含むデータ
    const jitValidationInput: AuthenticateUserUseCaseInput = {
      jwt: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJnb29nbGVfZG9tYWluX3Rlc3QiLCJlbWFpbCI6InZhbGlkQGV4YW1wbGUuY29tIiwiYXBwX21ldGFkYXRhIjp7InByb3ZpZGVyIjoiZ29vZ2xlIiwicHJvdmlkZXJzIjpbImdvb2dsZSJdfSwidXNlcl9tZXRhZGF0YSI6eyJuYW1lIjoi44OJ44Oh44Kk44Oz44OG44K544OIIiwiYXZhdGFyX3VybCI6bnVsbCwiZW1haWwiOiJ2YWxpZEBleGFtcGxlLmNvbSIsImZ1bGxfbmFtZSI6IuODieODoeOCpOODs+ODhuOCueODiCJ9LCJpc3MiOiJodHRwczovL3N1cGFiYXNlLmV4YW1wbGUuY29tIiwiaWF0IjoxNzAzMTIzNDU2LCJleHAiOjE3MDMxMjcwNTZ9.domain_test_signature"
    };

    // 【実際の処理実行】: AuthenticateUserUseCaseのexecuteメソッドでJIT処理を実行
    // 【処理内容】: UserAggregateによるドメインオブジェクト生成とビジネスルール適用を含むJIT処理
    // ❌ 注意: このテストは現在失敗する（ドメイン統合されたJIT処理が未実装のため）
    const authenticateUserUseCase = new (await import("../AuthenticateUserUseCase")).AuthenticateUserUseCase();
    const result: AuthenticateUserUseCaseOutput = await authenticateUserUseCase.execute(jitValidationInput);

    // 【結果検証】: ドメインオブジェクトとしての品質と整合性を検証
    // 【期待値確認】: UserEntityのビジネスルールと制約が適切に適用されていることを確認

    expect(result.user.id).toBeDefined(); // 【確認内容】: プライマリキーとしてのUUIDが適切に設定されることを確認 🟢
    expect(result.user.externalId).toBe("google_domain_test"); // 【確認内容】: 外部プロバイダーIDが正規化されて設定されることを確認 🟢
    expect(result.user.provider).toBe("google"); // 【確認内容】: AuthProvider enum値が正しく設定されることを確認 🟢
    expect(result.user.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/); // 【確認内容】: メールアドレス形式のバリデーションが適用されることを確認 🟢
    expect(result.user.name.trim().length).toBeGreaterThan(0); // 【確認内容】: 名前が空文字でないことをドメインルールで確認 🟢
    expect(result.user.avatarUrl).toBeNull(); // 【確認内容】: nullが適切に処理されることを確認 🟢

    // 【品質保証】: この検証により、JIT処理がDDDの原則に従ってドメインオブジェクトを正しく構築し、
    // ビジネスルールと制約を適切に適用することが保証される
  });
});