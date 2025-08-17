import { beforeEach, describe, expect, test } from 'bun:test';
import type {
  ExternalUserInfo,
  JwtPayload,
  JwtVerificationResult,
} from '@/domain/services/IAuthProvider';
import { SupabaseAuthProvider } from '../SupabaseAuthProvider';

describe('SupabaseAuthProvider', () => {
  let authProvider: SupabaseAuthProvider;

  beforeEach(() => {
    // 【テスト前準備】: 各テスト実行前にSupabaseAuthProviderインスタンスを初期化し、一貫したテスト条件を保証
    // 【環境初期化】: 前のテストの影響を受けないよう、新しいプロバイダーインスタンスを作成
    process.env.SUPABASE_JWT_SECRET = 'test-secret-key-for-jwt-verification';
    authProvider = new SupabaseAuthProvider();
  });

  describe('verifyToken', () => {
    test('有効なGoogle OAuth JWTが正常に検証される', async () => {
      // 【テスト目的】: 有効なGoogle OAuth JWTの署名検証と正確なペイロード抽出を確認
      // 【テスト内容】: Supabase JWT Secretで署名されたJWTトークンの検証処理
      // 【期待される動作】: 検証成功・ペイロード情報の正確な取得・型安全性の保証
      // 🟢 青信号: 要件定義書・JWTペイロード仕様から明確に定義済み

      // 【テストデータ準備】: Google OAuth認証完了後のSupabaseから発行されるJWTを模擬
      // 【初期条件設定】: SUPABASE_JWT_SECRET環境変数が適切に設定された状態
      const validGoogleJwt =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJnb29nbGVfMTIzNDU2Nzg5MCIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsImFwcF9tZXRhZGF0YSI6eyJwcm92aWRlciI6Imdvb2dsZSIsInByb3ZpZGVycyI6WyJnb29nbGUiXX0sInVzZXJfbWV0YWRhdGEiOnsibmFtZSI6IlRlc3QgVXNlciIsImF2YXRhcl91cmwiOiJodHRwczovL2V4YW1wbGUuY29tL2F2YXRhci5qcGciLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJmdWxsX25hbWUiOiJUZXN0IFVzZXIifSwiaXNzIjoiaHR0cHM6Ly95b3VyLXN1cGFiYXNlLnVybCIsImlhdCI6MTY5Mjc4MDgwMCwiZXhwIjoyMDA4MTQwODAwfQ.signature';

      // 【実際の処理実行】: verifyTokenメソッドにJWTトークンを渡して検証実行
      // 【処理内容】: JWT署名検証・有効期限チェック・発行者確認・ペイロード抽出
      const result: JwtVerificationResult =
        await authProvider.verifyToken(validGoogleJwt);

      // 【結果検証】: JwtVerificationResultの構造とペイロード内容の確認
      // 【期待値確認】: valid=true、完全なペイロード情報、エラー情報なし
      expect(result.valid).toBe(true); // 【確認内容】: JWT検証の成功フラグ確認 🟢
      expect(result.payload).toBeDefined(); // 【確認内容】: JWTペイロードが正常に抽出されることを確認 🟢
      expect(result.error).toBeUndefined(); // 【確認内容】: エラー情報が含まれていないことを確認 🟢
      expect(result.payload?.sub).toBe('google_1234567890'); // 【確認内容】: Google外部IDの正確な抽出確認 🟢
      expect(result.payload?.email).toBe('test@example.com'); // 【確認内容】: メールアドレスの正確な抽出確認 🟢
      expect(result.payload?.app_metadata.provider).toBe('google'); // 【確認内容】: プロバイダー種別の正確な抽出確認 🟢
    });

    test('不正な署名のJWTが確実に拒否される', async () => {
      // 【テスト目的】: 不正な署名を持つJWTの拒否処理確認とセキュリティ要件の保証
      // 【テスト内容】: 異なるシークレットで署名されたJWTや改ざんされたJWTの検証処理
      // 【期待される動作】: 検証失敗・適切なエラーメッセージ・認証処理の中断
      // 🟢 青信号: EARS要件EDGE-002から明確に定義済み

      // 【テストデータ準備】: 悪意のあるクライアントからの偽造JWT送信を模擬
      // 【初期条件設定】: 不正な署名部分を持つJWTトークン
      const invalidSignatureJwt =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJnb29nbGVfMTIzNDU2Nzg5MCIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSJ9.invalid_signature';

      // 【実際の処理実行】: 不正署名JWTでのverifyToken実行
      // 【処理内容】: 署名検証の実行とセキュリティ侵害の検出
      const result: JwtVerificationResult =
        await authProvider.verifyToken(invalidSignatureJwt);

      // 【結果検証】: 署名検証失敗の適切な処理確認
      // 【期待値確認】: valid=false、エラーメッセージの存在、ペイロード情報なし
      expect(result.valid).toBe(false); // 【確認内容】: JWT検証の失敗フラグ確認 🟢
      expect(result.error).toBeDefined(); // 【確認内容】: エラー情報が適切に設定されることを確認 🟢
      expect(result.error).toContain('Invalid signature'); // 【確認内容】: 署名検証失敗を示すエラーメッセージ確認 🟢
      expect(result.payload).toBeUndefined(); // 【確認内容】: 不正JWT時にペイロード情報が含まれないことを確認 🟢
    });

    test('有効期限が切れたJWTが確実に拒否される', async () => {
      // 【テスト目的】: 期限切れJWTの拒否処理確認とセッション期限管理の保証
      // 【テスト内容】: exp claimが現在時刻より前のJWTトークンの検証処理
      // 【期待される動作】: 検証失敗・期限切れエラーメッセージ・認証処理の中断
      // 🟢 青信号: セキュリティ要件・JWT仕様から明確に定義済み

      // 【テストデータ準備】: ユーザーが長時間ページを開きっぱなしにした後のAPI呼び出しを模擬
      // 【初期条件設定】: exp claim（1692780800）が現在時刻より過去のJWT
      const expiredJwt =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJnb29nbGVfMTIzNDU2Nzg5MCIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsImV4cCI6MTY5Mjc4MDgwMH0.valid_signature_but_expired';

      // 【実際の処理実行】: 期限切れJWTでのverifyToken実行
      // 【処理内容】: 有効期限チェックの実行と期限切れの検出
      const result: JwtVerificationResult =
        await authProvider.verifyToken(expiredJwt);

      // 【結果検証】: 期限切れ検証の適切な処理確認
      // 【期待値確認】: valid=false、期限切れエラーメッセージ、ペイロード情報なし
      expect(result.valid).toBe(false); // 【確認内容】: JWT検証の失敗フラグ確認 🟢
      expect(result.error).toBeDefined(); // 【確認内容】: エラー情報が適切に設定されることを確認 🟢
      expect(result.error).toContain('Token expired'); // 【確認内容】: 期限切れを示すエラーメッセージ確認 🟢
      expect(result.payload).toBeUndefined(); // 【確認内容】: 期限切れJWT時にペイロード情報が含まれないことを確認 🟢
    });

    test('JWT形式に準拠しないトークンが確実に拒否される', async () => {
      // 【テスト目的】: 形式不正JWTの拒否処理確認と入力検証機能の保証
      // 【テスト内容】: header.payload.signature形式でないトークン文字列の検証処理
      // 【期待される動作】: 検証失敗・形式不正エラーメッセージ・パース処理でのクラッシュ防止
      // 🟢 青信号: JWT仕様・エラーハンドリング要件から明確に定義済み

      // 【テストデータ準備】: 不正なクライアント実装やAPI呼び出し時のトークン破損を模擬
      // 【初期条件設定】: JWT標準形式（3つのBase64URL部分をドットで区切り）に準拠していないトークン
      const malformedJwt = 'not-a-jwt-token';

      // 【実際の処理実行】: 形式不正トークンでのverifyToken実行
      // 【処理内容】: JWT形式チェックの実行と形式不正の検出
      const result: JwtVerificationResult =
        await authProvider.verifyToken(malformedJwt);

      // 【結果検証】: 形式不正検証の適切な処理確認
      // 【期待値確認】: valid=false、形式不正エラーメッセージ、ペイロード情報なし
      expect(result.valid).toBe(false); // 【確認内容】: JWT検証の失敗フラグ確認 🟢
      expect(result.error).toBeDefined(); // 【確認内容】: エラー情報が適切に設定されることを確認 🟢
      expect(result.error).toContain('Invalid token format'); // 【確認内容】: 形式不正を示すエラーメッセージ確認 🟢
      expect(result.payload).toBeUndefined(); // 【確認内容】: 形式不正JWT時にペイロード情報が含まれないことを確認 🟢
    });

    test('空文字列やnullトークンが適切に拒否される', async () => {
      // 【テスト目的】: 空文字列・null値の拒否処理確認と入力検証の網羅性保証
      // 【テスト内容】: 有効な入力の最小限界（文字列の最小値）での検証処理
      // 【期待される動作】: 検証失敗・必須パラメータエラーメッセージ・null値チェックの正常動作
      // 🟢 青信号: 入力検証要件から明確に定義済み

      // 【テストデータ準備】: フロントエンドでのトークン取得失敗や初期化不備を模擬
      // 【初期条件設定】: 文字列パラメータの最小/無効値
      const emptyToken = '';

      // 【実際の処理実行】: 空文字列トークンでのverifyToken実行
      // 【処理内容】: 入力値チェックの実行と必須パラメータ不足の検出
      const result: JwtVerificationResult =
        await authProvider.verifyToken(emptyToken);

      // 【結果検証】: 空文字列検証の適切な処理確認
      // 【期待値確認】: valid=false、必須パラメータエラーメッセージ、ペイロード情報なし
      expect(result.valid).toBe(false); // 【確認内容】: JWT検証の失敗フラグ確認 🟢
      expect(result.error).toBeDefined(); // 【確認内容】: エラー情報が適切に設定されることを確認 🟢
      expect(result.error).toContain('Token is required'); // 【確認内容】: 必須パラメータ不足を示すエラーメッセージ確認 🟢
      expect(result.payload).toBeUndefined(); // 【確認内容】: 空文字列時にペイロード情報が含まれないことを確認 🟢
    });
  });

  describe('getExternalUserInfo', () => {
    test('完全なJWTペイロードから正確なユーザー情報が抽出される', async () => {
      // 【テスト目的】: JWTペイロードからExternalUserInfoオブジェクトへの変換処理確認
      // 【テスト内容】: すべての必須・オプションフィールドの正確なマッピング処理
      // 【期待される動作】: 完全なユーザー情報抽出・フィールドマッピングの正確性・日本語名の適切な処理
      // 🟢 青信号: ExternalUserInfo型定義から明確に定義済み

      // 【テストデータ準備】: Google OAuth認証完了後のSupabase JWT内ペイロード情報を模擬
      // 【初期条件設定】: すべての必須・オプションフィールドを含む完全なJWTペイロード
      const validPayload: JwtPayload = {
        sub: 'google_1234567890',
        email: 'test@example.com',
        app_metadata: {
          provider: 'google',
          providers: ['google'],
        },
        user_metadata: {
          name: '田中太郎',
          avatar_url: 'https://lh3.googleusercontent.com/avatar.jpg',
          email: 'test@example.com',
          full_name: '田中太郎',
        },
        iss: 'https://your-supabase.url',
        iat: 1692780800,
        exp: 1692784400,
      };

      // 【実際の処理実行】: getExternalUserInfoメソッドでJWTペイロードを変換
      // 【処理内容】: ペイロード情報からExternalUserInfo形式への正規化処理
      const userInfo: ExternalUserInfo =
        await authProvider.getExternalUserInfo(validPayload);

      // 【結果検証】: ExternalUserInfoの構造と内容の確認
      // 【期待値確認】: すべてのフィールドが正確にマッピングされ、正規化されたユーザー情報が取得される
      expect(userInfo.id).toBe('google_1234567890'); // 【確認内容】: Google外部IDの正確な抽出確認 🟢
      expect(userInfo.provider).toBe('google'); // 【確認内容】: プロバイダー種別の固定値確認 🟢
      expect(userInfo.email).toBe('test@example.com'); // 【確認内容】: メールアドレスの正確な抽出確認 🟢
      expect(userInfo.name).toBe('田中太郎'); // 【確認内容】: 日本語名の適切な処理確認 🟢
      expect(userInfo.avatarUrl).toBe(
        'https://lh3.googleusercontent.com/avatar.jpg',
      ); // 【確認内容】: アバター画像URLの正確な抽出確認 🟢
    });

    test('avatar_urlが存在しない場合に適切に処理される', async () => {
      // 【テスト目的】: オプションフィールドが未設定の場合のマッピング処理確認
      // 【テスト内容】: オプションフィールドが未設定の場合の適切な処理
      // 【期待される動作】: avatarUrlフィールドがundefinedとして正しく処理される
      // 🟢 青信号: オプションフィールド仕様から明確に定義済み

      // 【テストデータ準備】: Googleアカウントでプロフィール画像を設定していないユーザーを模擬
      // 【初期条件設定】: avatar_urlフィールドが存在しないJWTペイロード
      const payloadWithoutAvatar: JwtPayload = {
        sub: 'google_0987654321',
        email: 'user@example.com',
        app_metadata: { provider: 'google', providers: ['google'] },
        user_metadata: {
          name: '山田花子',
          email: 'user@example.com',
          full_name: '山田花子',
          // avatar_url なし
        },
        iss: 'https://your-supabase.url',
        iat: 1692780800,
        exp: 1692784400,
      };

      // 【実際の処理実行】: avatar_url未設定ペイロードでのgetExternalUserInfo実行
      // 【処理内容】: オプションフィールドの適切な処理とundefined値の設定
      const userInfo: ExternalUserInfo =
        await authProvider.getExternalUserInfo(payloadWithoutAvatar);

      // 【結果検証】: オプションフィールドの適切な処理確認
      // 【期待値確認】: avatarUrlがundefinedとして正しく処理され、他のフィールドは正常に抽出される
      expect(userInfo.id).toBe('google_0987654321'); // 【確認内容】: Google外部IDの正確な抽出確認 🟢
      expect(userInfo.provider).toBe('google'); // 【確認内容】: プロバイダー種別の固定値確認 🟢
      expect(userInfo.email).toBe('user@example.com'); // 【確認内容】: メールアドレスの正確な抽出確認 🟢
      expect(userInfo.name).toBe('山田花子'); // 【確認内容】: 日本語名の適切な処理確認 🟢
      expect(userInfo.avatarUrl).toBeUndefined(); // 【確認内容】: オプションフィールドがundefinedとして適切に処理されることを確認 🟢
    });

    test('必須フィールド不足ペイロードでエラーが発生する', async () => {
      // 【テスト目的】: 必須フィールド不足ペイロードの拒否処理確認とデータ検証機能の保証
      // 【テスト内容】: JWTペイロードに必須フィールドが含まれていない状況での処理
      // 【期待される動作】: ExternalUserInfoExtractionError例外のスロー・不足フィールドの明確な通知
      // 🟢 青信号: 要件定義書エッジケースから明確に定義済み

      // 【テストデータ準備】: Supabase設定不備やGoogle OAuth応答の異常を模擬
      // 【初期条件設定】: ユーザー識別に必須のsubフィールドが欠落したペイロード
      const incompletePayload = {
        // sub フィールドなし
        email: 'test@example.com',
        app_metadata: { provider: 'google', providers: ['google'] },
        user_metadata: { name: 'Test User' },
        iss: 'https://your-supabase.url',
        iat: 1692780800,
        exp: 1692784400,
      } as JwtPayload;

      // 【実際の処理実行】: 必須フィールド不足ペイロードでのgetExternalUserInfo実行
      // 【処理内容】: 必須フィールド検証の実行と不足フィールドの検出
      // 【期待される動作】: ExternalUserInfoExtractionError例外をスロー
      await expect(
        authProvider.getExternalUserInfo(incompletePayload),
      ).rejects.toThrow(); // 【確認内容】: 必須フィールド不足時に例外がスローされることを確認 🟢
    });
  });
});
