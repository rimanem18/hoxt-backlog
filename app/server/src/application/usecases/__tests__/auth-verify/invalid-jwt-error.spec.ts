import { describe, test, expect, beforeEach, afterEach, mock } from "bun:test";
import type { AuthenticateUserUseCaseInput } from "@/packages/shared-schemas/src/auth";
import { makeSUT } from "../authenticate-user/helpers/makeSUT";
import type { IAuthProvider } from "@/domain/services/IAuthProvider";
import { AuthenticationError } from "@/domain/user/errors/AuthenticationError";
import { TokenExpiredError } from "@/domain/user/errors/TokenExpiredError";

/**
 * TDD Red フェーズ: 無効JWT検証エラーテスト
 *
 * 【テスト目的】: 無効なJWTトークンでの認証失敗が適切にハンドリングされることを確認
 * 【テスト内容】: 不正な署名・改ざんされたJWTを送信した際のエラーハンドリングを検証
 * 【期待される動作】: JWT検証失敗→AuthenticationError発生→適切なエラーレスポンス返却
 * 🟢 信頼性レベル: EARS要件EDGE-002・api-endpoints.md・JWTセキュリティ仕様から直接抽出
 */
describe("AuthenticateUserUseCase - 無効JWT検証エラーテスト", () => {
  beforeEach(() => {
    // 【テスト前準備】: 各テスト実行前にエラーハンドリングテスト環境を初期化
    // 【環境初期化】: 不正なJWTを適切に検出・処理できる状態に設定
    console.log("無効JWT検証エラーテスト環境の初期化を開始");
  });

  afterEach(() => {
    // 【テスト後処理】: テスト実行後にエラー状態・ログ・セキュリティコンテキストをクリーンアップ
    // 【状態復元】: セキュリティテストの痕跡を削除し、次のテストに影響しないよう初期化
    console.log("無効JWT検証エラーテスト環境のクリーンアップを完了");
  });

  test("無効な署名を持つJWTで認証が失敗する", async () => {
    // 【テスト目的】: JWT署名検証機能が不正なトークンを確実に拒否することを確認
    // 【テスト内容】: AuthenticateUserUseCaseが無効署名のJWTに対して適切なエラーを返すことを検証
    // 【期待される動作】: JWT署名検証失敗→AuthenticationError発生→INVALID_TOKENエラーコード返却
    // 🟢 信頼性レベル: JWT標準仕様・セキュリティ要件・api-endpoints.mdから直接抽出

    // 【テストデータ準備】: 不正な署名を持つJWTトークンを模擬（改ざん・偽造）
    // 【初期条件設定】: Supabaseの公開鍵で検証すると署名が一致しない状態のトークン
    const invalidSignatureJwtInput: AuthenticateUserUseCaseInput = {
      jwt: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJnb29nbGVfMTIzNDU2Nzg5IiwiZW1haWwiOiJ1c2VyQGV4YW1wbGUuY29tIiwiYXBwX21ldGFkYXRhIjp7InByb3ZpZGVyIjoiZ29vZ2xlIiwicHJvdmlkZXJzIjpbImdvb2dsZSJdfSwidXNlcl9tZXRhZGF0YSI6eyJuYW1lIjoi5bGx55Sw5aSq6YOOIiwiYXZhdGFyX3VybCI6Imh0dHBzOi8vbGgzLmdvb2dsZXVzZXJjb250ZW50LmNvbS9hL2F2YXRhci5qcGciLCJlbWFpbCI6InVzZXJAZXhhbXBsZS5jb20iLCJmdWxsX25hbWUiOiLlsbHnlLDlpKrpg44ifSwiaXNzIjoiaHR0cHM6Ly9zdXBhYmFzZS5leGFtcGxlLmNvbSIsImlhdCI6MTcwMzEyMzQ1NiwiZXhwIjoxNzAzMTI3MDU2fQ.invalid_signature_tampered"
    };

    // 【依存関係注入】: makeSUTヘルパーで適切なモックセットアップを実行
    // 【実装方針】: 無効JWT検証のためauthProviderモックで検証失敗状態を設定
    // 🟢 信頼性レベル: 既存のテストパターンから抽出された確立された手法
    const mockAuthProvider: Partial<IAuthProvider> = {
      verifyToken: mock().mockResolvedValue({
        valid: false,
        payload: {},
        error: "Invalid signature",
      }),
    };

    // 【実際の処理実行】: makeSUTで構築したSUTでJWT検証を実行
    // 【処理内容】: JWT署名検証→検証失敗検出→AuthenticationError発生→エラー情報返却
    const { sut: authenticateUserUseCase } = makeSUT({
      authProvider: mockAuthProvider as IAuthProvider,
    });

    // 【結果検証】: 無効JWTに対する適切なエラー処理と情報非開示を検証
    // 【期待値確認】: AuthenticationError発生・適切なエラーコード・セキュリティ情報の保護

    await expect(authenticateUserUseCase.execute(invalidSignatureJwtInput)).rejects.toThrow("認証トークンが無効です"); // 【確認内容】: JWT署名検証失敗時に適切な例外が発生することを確認 🟢

    // 追加のエラー詳細検証
    try {
      await authenticateUserUseCase.execute(invalidSignatureJwtInput);
      fail("無効JWTで例外が発生しなかった"); // 【確認内容】: セキュリティ上、無効JWTは必ず拒否されるべき 🟢
    } catch (error: any) {
      expect(error.name).toBe("AuthenticationError"); // 【確認内容】: 正しいドメインエラータイプが発生することを確認 🟢
      expect(error.code).toBe("INVALID_TOKEN"); // 【確認内容】: 適切なエラーコードが設定されることを確認 🟢
      expect(error.message).toBe("認証トークンが無効です"); // 【確認内容】: ユーザーフレンドリーなエラーメッセージが提供されることを確認 🟢
    }

    // 【品質保証】: この検証により、JWT署名検証の堅牢性と不正アクセス防止機能が保証され、
    // セキュリティ侵害を確実に遮断できることが確認される
  });

  test("不正な形式のJWTで認証が失敗する", async () => {
    // 【テスト目的】: JWT形式チェック機能が不正なトークン形式を確実に拒否することを確認
    // 【テスト内容】: 形式不正・ペイロード破損・不完全なJWTに対する適切なエラー処理を検証
    // 【期待される動作】: JWT形式検証失敗→AuthenticationError発生→INVALID_TOKENエラーコード返却
    // 🟢 信頼性レベル: JWT標準形式・エラーハンドリング要件から直接抽出

    // 【テストデータ準備】: 不正な形式を持つJWTトークンのパターンを模擬
    // 【初期条件設定】: header.payload.signatureの標準形式に従わないトークン
    const malformedJwtInputs: AuthenticateUserUseCaseInput[] = [
      { jwt: "invalid.jwt.token.format.broken" }, // 不正なセグメント数
      { jwt: "not-a-jwt-at-all" }, // JWT形式ではない文字列
      { jwt: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.broken_base64_payload.signature" }, // 破損したBase64
    ];

    // 【依存関係注入】: 不正形式JWT検証用モックの設定
    // 【実装方針】: authProviderで各種不正形式に対して検証失敗を返すように設定
    // 🟢 信頼性レベル: 既存テストパターンを活用した確立された手法
    const mockAuthProvider: Partial<IAuthProvider> = {
      verifyToken: mock().mockResolvedValue({
        valid: false,
        payload: {},
        error: "Malformed JWT",
      }),
    };

    const { sut: authenticateUserUseCase } = makeSUT({
      authProvider: mockAuthProvider as IAuthProvider,
    });

    // 【実際の処理実行】: 各種不正形式JWTに対する検証処理を実行
    // 【処理内容】: JWT形式チェック→検証失敗検出→AuthenticationError発生→エラー情報返却
    // ❌ 注意: このテストは現在失敗する（JWT形式検証エラーハンドリングが未実装のため）
    for (const invalidInput of malformedJwtInputs) {
      // 【結果検証】: 各種不正形式に対する一貫したエラー処理を検証
      // 【期待値確認】: 全ての不正形式で統一されたエラーレスポンス・セキュリティ保護

      await expect(authenticateUserUseCase.execute(invalidInput)).rejects.toThrow("認証トークンが無効です"); // 【確認内容】: 不正形式JWT全てで適切な例外が発生することを確認 🟢

      try {
        await authenticateUserUseCase.execute(invalidInput);
        fail(`不正形式JWT "${invalidInput.jwt}" で例外が発生しなかった`); // 【確認内容】: 全ての不正形式が確実に拒否されることを確認 🟢
      } catch (error: any) {
        expect(error.name).toBe("AuthenticationError"); // 【確認内容】: 一貫したドメインエラータイプの発生を確認 🟢
        expect(error.code).toBe("INVALID_FORMAT"); // 【確認内容】: 統一されたエラーコードの設定を確認 🟢
        expect(error.message).toBe("認証トークンが無効です"); // 【確認内容】: 攻撃者に有用情報を与えない統一メッセージを確認 🟢
      }
    }

    // 【品質保証】: この検証により、JWT形式検証の包括性と攻撃耐性が保証され、
    // 様々な形式の不正トークンに対する防御能力が確認される
  });

  test("期限切れJWTで認証が失敗する", async () => {
    // 【テスト目的】: JWT期限管理機能が期限切れトークンを確実に拒否することを確認
    // 【テスト内容】: expクレームが現在時刻を過ぎたJWTに対する適切なエラー処理を検証
    // 【期待される動作】: JWT期限チェック→期限切れ検出→TOKEN_EXPIREDエラーコード返却
    // 🟢 信頼性レベル: JWT標準exp仕様・セキュリティ要件から直接抽出

    // 【テストデータ準備】: 期限切れのJWTトークンを模擬（現在時刻より過去のexp）
    // 【初期条件設定】: 正しい署名だが有効期限が過ぎたトークン
    const expiredJwtInput: AuthenticateUserUseCaseInput = {
      jwt: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJnb29nbGVfMTIzNDU2Nzg5IiwiZW1haWwiOiJ1c2VyQGV4YW1wbGUuY29tIiwiYXBwX21ldGFkYXRhIjp7InByb3ZpZGVyIjoiZ29vZ2xlIiwicHJvdmlkZXJzIjpbImdvb2dsZSJdfSwidXNlcl9tZXRhZGF0YSI6eyJuYW1lIjoi5bGx55Sw5aSq6YOOIiwiYXZhdGFyX3VybCI6Imh0dHBzOi8vbGgzLmdvb2dsZXVzZXJjb250ZW50LmNvbS9hL2F2YXRhci5qcGciLCJlbWFpbCI6InVzZXJAZXhhbXBsZS5jb20iLCJmdWxsX25hbWUiOiLlsbHnlLDlpKrpg44ifSwiaXNzIjoiaHR0cHM6Ly9zdXBhYmFzZS5leGFtcGxlLmNvbSIsImlhdCI6MTcwMzEyMzQ1NiwiZXhwIjoxNzAzMTIzNDU2fQ.expired_but_valid_signature"
    };

    // 【依存関係注入】: 期限切れJWT検証用モックの設定
    // 【実装方針】: authProviderで期限切れエラーを返すように設定
    // 🟢 信頼性レベル: 既存テストパターンを活用した確立された手法
    const mockAuthProvider: Partial<IAuthProvider> = {
      verifyToken: mock().mockResolvedValue({
        valid: false,
        payload: {},
        error: "Token expired",
      }),
    };

    // 【実際の処理実行】: makeSUTで構築したSUTで期限チェックを実行
    // 【処理内容】: JWT期限検証→期限切れ検出→TokenExpiredError発生→エラー情報返却
    const { sut: authenticateUserUseCase } = makeSUT({
      authProvider: mockAuthProvider as IAuthProvider,
    });

    // 【結果検証】: 期限切れJWTに対する適切なエラー処理とユーザビリティ配慮を検証
    // 【期待値確認】: TOKEN_EXPIREDエラーコード・再ログイン誘導メッセージ・セッション状態クリア

    await expect(authenticateUserUseCase.execute(expiredJwtInput)).rejects.toThrow("認証トークンの有効期限が切れています"); // 【確認内容】: JWT期限切れ時に適切な例外が発生することを確認 🟢

    try {
      await authenticateUserUseCase.execute(expiredJwtInput);
      fail("期限切れJWTで例外が発生しなかった"); // 【確認内容】: 期限管理の確実性を確認 🟢
    } catch (error: any) {
      expect(error.name).toBe("TokenExpiredError"); // 【確認内容】: 期限切れ専用のエラータイプが発生することを確認 🟢
      expect(error.code).toBe("TOKEN_EXPIRED"); // 【確認内容】: 期限切れ固有のエラーコードが設定されることを確認 🟢
      expect(error.message).toBe("認証トークンの有効期限が切れています"); // 【確認内容】: 再ログインを促すユーザーフレンドリーなメッセージを確認 🟢
    }

    // 【品質保証】: この検証により、JWT期限管理の正確性とタイムベースセキュリティが保証され、
    // セッションハイジャック防止と適切な再認証フロー誘導が確認される
  });

  test("空文字列JWTで入力検証エラーが発生する", async () => {
    // 【テスト目的】: 空文字列JWTに対する入力検証が確実に機能することを確認
    // 【テスト内容】: AuthenticateUserUseCaseが空文字列のJWTを受け取った際のエラー処理を検証
    // 【期待される動作】: 入力検証でValidationError発生
    const emptyJwtInput: AuthenticateUserUseCaseInput = {
      jwt: ""
    };

    const { sut: authenticateUserUseCase } = makeSUT();

    await expect(authenticateUserUseCase.execute(emptyJwtInput)).rejects.toThrow("JWTトークンが必要です");
  });
});
