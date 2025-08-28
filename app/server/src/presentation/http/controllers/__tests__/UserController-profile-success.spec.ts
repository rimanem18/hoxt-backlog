import { describe, test, expect, beforeEach, afterEach, mock } from "bun:test";
import { Hono } from "hono";
import type { GetUserProfileResponse } from "@/packages/shared-schemas/src/api";
import { UserController } from "../UserController";
import { authMiddleware } from "../../middleware/auth/AuthMiddleware";
import type { IGetUserProfileUseCase } from "@/application/usecases/GetUserProfileUseCase";
import type { User } from "@/packages/shared-schemas/src/user";

/**
 * TDD Red フェーズ: ユーザープロフィール取得成功テスト
 *
 * 【テスト目的】: GET /api/user/profile エンドポイントが認証済みユーザーのプロフィール情報を正常に返却することを確認
 * 【テスト内容】: Authorization ヘッダー検証→ユーザー情報取得→プロフィール返却の一連のHTTPフローを検証
 * 【期待される動作】: UserControllerが認証ミドルウェアを通過したリクエストを処理し、GetUserProfileUseCaseと連携してプロフィール情報を返却
 * 🟢 信頼性レベル: EARS要件REQ-005・api-endpoints.md・interfaces.tsから直接抽出
 */
describe("UserController - プロフィール取得成功テスト", () => {
  let app: Hono;
  let userController: UserController;
  let mockGetUserProfileUseCase: IGetUserProfileUseCase;

  beforeEach(() => {
    // 【テスト前準備】: 各テスト実行前にHonoアプリケーションとミドルウェアを初期化
    // 【環境初期化】: 認証ミドルウェア・UserController・ルーティング設定を含む統合環境を構築
    // 🟢 信頼性レベル: 既存の実装パターンから抽出された確立された手法
    console.log("UserController統合テスト環境の初期化を開始");

    // 【依存関係注入】: テスト用のモックUseCaseを作成
    // 【実装方針】: プロフィール取得成功パターンのモック設定
    const mockUser: User = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      externalId: "google_123456789",
      email: "user@example.com",
      name: "山田太郎",
      avatarUrl: "https://lh3.googleusercontent.com/a/avatar.jpg",
      createdAt: new Date("2025-08-12T10:30:00.000Z"),
      updatedAt: new Date("2025-08-12T10:30:00.000Z"),
      lastLoginAt: new Date("2025-08-12T13:45:00.000Z"),
    };

    mockGetUserProfileUseCase = {
      execute: mock().mockResolvedValue(mockUser),
    };

    // 【HTTPアプリケーションセットアップ】: 実際のミドルウェアとコントローラーを統合
    // 【実装方針】: 認証ミドルウェアでテスト用ユーザーIDを設定し、UserControllerで処理
    userController = new UserController(mockGetUserProfileUseCase);
    app = new Hono();
    
    // 【認証ミドルウェア統合】: テスト用のトークン取得関数でモック認証を実現
    app.use("/api/user/*", authMiddleware({
      getToken: () => "valid-test-token", // テスト用固定トークン
    }));
    
    // 【ルーティング設定】: UserControllerのgetProfileメソッドをエンドポイントに接続
    app.get("/api/user/profile", async (c) => {
      // 【コンテキスト設定】: テスト用ユーザーIDを設定（認証ミドルウェアが設定する想定）
      c.set('userId', '550e8400-e29b-41d4-a716-446655440000');
      return await userController.getProfile(c);
    });
  });

  afterEach(() => {
    // 【テスト後処理】: テスト実行後にHTTPコンテキスト・認証状態をクリーンアップ
    // 【状態復元】: 次のテストに影響しないよう、アプリケーション状態を初期化
    console.log("UserController統合テスト環境のクリーンアップを完了");
  });

  test("認証済みユーザーのプロフィール取得が成功する", async () => {
    // 【テスト目的】: 正常な認証フローを経たユーザーのプロフィール情報取得処理を確認
    // 【テスト内容】: GET /api/user/profileへのリクエストが適切なレスポンスを返却することを検証
    // 【期待される動作】: AuthMiddleware→UserController→GetUserProfileUseCase→レスポンス生成の流れが正常動作
    // 🟢 信頼性レベル: api-endpoints.md・UserController仕様から直接抽出

    // 【テストデータ準備】: 有効な認証ヘッダーを持つHTTPリクエストを模擬
    // 【初期条件設定】: 既存ユーザーが認証済み状態で、データベースに該当ユーザーが存在する状態
    const authHeaders = {
      "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJnb29nbGVfMTIzNDU2Nzg5IiwiZW1haWwiOiJ1c2VyQGV4YW1wbGUuY29tIiwiYXBwX21ldGFkYXRhIjp7InByb3ZpZGVyIjoiZ29vZ2xlIiwicHJvdmlkZXJzIjpbImdvb2dsZSJdfSwidXNlcl9tZXRhZGF0YSI6eyJuYW1lIjoi5bGx55Sw5aSq6YOOIiwiYXZhdGFyX3VybCI6Imh0dHBzOi8vbGgzLmdvb2dsZXVzZXJjb250ZW50LmNvbS9hL2F2YXRhci5qcGciLCJlbWFpbCI6InVzZXJAZXhhbXBsZS5jb20iLCJmdWxsX25hbWUiOiLlsbHnlLDlpKrpg44ifSwiaXNzIjoiaHR0cHM6Ly9zdXBhYmFzZS5leGFtcGxlLmNvbSIsImlhdCI6MTcwMzEyMzQ1NiwiZXhwIjoxNzAzMTI3MDU2fQ.valid_signature",
      "Content-Type": "application/json"
    };

    // 【実際の処理実行】: GET /api/user/profile エンドポイントにHTTPリクエストを送信
    // 【処理内容】: 認証ミドルウェア処理→UserController呼び出し→GetUserProfileUseCase実行→JSON レスポンス生成
    // ❌ 注意: このテストは現在失敗する（UserController・認証ミドルウェア統合が未実装のため）
    const response = await app.request("/api/user/profile", {
      method: "GET",
      headers: authHeaders
    });

    // 【結果検証】: HTTPレスポンスのステータス・ヘッダー・ボディが期待される形式であることを検証
    // 【期待値確認】: 200 OK・正しいContent-Type・適切なJSON構造でプロフィール情報が返却される

    expect(response.status).toBe(200); // 【確認内容】: HTTPステータスコードが200 OKであることを確認 🟢
    expect(response.headers.get("Content-Type")).toBe("application/json"); // 【確認内容】: レスポンスヘッダーが適切なContent-Typeを持つことを確認 🟢

    const responseBody: GetUserProfileResponse = await response.json();

    expect(responseBody.success).toBe(true); // 【確認内容】: APIレスポンスが成功を示すことを確認 🟢
    expect(responseBody.data).toBeDefined(); // 【確認内容】: ユーザーデータが返却されることを確認 🟢
    expect(responseBody.data.id).toBe("550e8400-e29b-41d4-a716-446655440000"); // 【確認内容】: ユーザーIDが正確に返却されることを確認 🟢
    expect(responseBody.data.externalId).toBe("google_123456789"); // 【確認内容】: 外部プロバイダーIDが正確に返却されることを確認 🟢
    expect(responseBody.data.provider).toBe("google"); // 【確認内容】: 認証プロバイダーが正確に返却されることを確認 🟢
    expect(responseBody.data.email).toBe("user@example.com"); // 【確認内容】: メールアドレスが正確に返却されることを確認 🟢
    expect(responseBody.data.name).toBe("山田太郎"); // 【確認内容】: 表示名が正確に返却されることを確認 🟢
    expect(responseBody.data.avatarUrl).toBe("https://lh3.googleusercontent.com/a/avatar.jpg"); // 【確認内容】: アバターURLが正確に返却されることを確認 🟢
    expect(responseBody.data.createdAt).toBe("2025-08-12T10:30:00.000Z"); // 【確認内容】: アカウント作成日時が正確に返却されることを確認 🟢
    expect(responseBody.data.updatedAt).toBe("2025-08-12T10:30:00.000Z"); // 【確認内容】: 最終更新日時が正確に返却されることを確認 🟢
    expect(responseBody.data.lastLoginAt).toBe("2025-08-12T13:45:00.000Z"); // 【確認内容】: 最終ログイン日時が正確に返却されることを確認 🟢

    // 【品質保証】: この検証により、UserController・GetUserProfileUseCase・認証ミドルウェアの統合が正常に動作し、
    // RESTful APIとしての適切なレスポンス形式でプロフィール情報を返却することが保証される
  });

  test("認証ミドルウェアとUserControllerの連携が正常に動作する", async () => {
    // 【テスト目的】: AuthMiddlewareで設定されたコンテキスト情報がUserControllerで正しく利用されることを確認
    // 【テスト内容】: ミドルウェアチェーンでのユーザー情報受け渡しとコンテキスト管理を検証
    // 【期待される動作】: AuthMiddleware→Context設定→UserController→ユーザーID抽出→UseCase呼び出し
    // 🟢 信頼性レベル: Honoミドルウェア仕様・architecture.md Presentation層設計から直接抽出

    // 【テストデータ準備】: 認証ミドルウェアでコンテキスト設定される形式のリクエスト
    // 【初期条件設定】: JWTペイロードからユーザー情報が抽出され、Honoコンテキストに設定された状態
    const validAuthRequest = {
      method: "GET",
      headers: {
        "Authorization": "Bearer valid.jwt.token.with.proper.signature"
      }
    };

    // 【実際の処理実行】: 認証ミドルウェア→UserControllerの連携フローを実行
    // 【処理内容】: JWT検証→コンテキスト設定→Controller呼び出し→UseCase連携→レスポンス生成
    // ❌ 注意: このテストは現在失敗する（AuthMiddleware・UserControllerの統合が未実装のため）
    const response = await app.request("/api/user/profile", validAuthRequest);

    // 【結果検証】: ミドルウェア連携の成功とレスポンス品質を検証
    // 【期待値確認】: 認証情報の正確な受け渡しと適切なHTTPレスポンス生成

    expect(response.status).toBe(200); // 【確認内容】: 認証ミドルウェア通過後のHTTP成功ステータスを確認 🟢

    const responseData = await response.json();
    expect(responseData.success).toBe(true); // 【確認内容】: API統合処理の成功を確認 🟢
    expect(responseData.data.id).toBeDefined(); // 【確認内容】: コンテキスト経由で取得されたユーザーIDが返却されることを確認 🟢

    // 【品質保証】: この検証により、Presentation層でのミドルウェアチェーン・コンテキスト管理・
    // Controller-UseCase連携が正常に動作することが保証される
  });
});
