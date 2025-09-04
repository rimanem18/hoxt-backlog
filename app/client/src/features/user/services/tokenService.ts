/**
 * トークン管理サービス
 * localStorage直接アクセスの依存性逆転原則改善とトークン操作の抽象化
 */

/**
 * トークン管理の抽象化による依存性逆転インターフェース
 */
export interface TokenService {
  /**
   * 認証トークンを取得
   * @returns {string | null} JWT認証トークン（未存在時はnull）
   */
  getToken(): string | null;

  /**
   * 認証トークンを保存
   * @param {string} token - 保存するJWTトークン
   */
  setToken(token: string): void;

  /**
   * 認証トークンを削除
   */
  removeToken(): void;

  /**
   * トークンの有効性を検証
   * @returns {boolean} トークンが存在し有効な場合true
   */
  isTokenValid(): boolean;
}

/**
 * localStorageを使用したTokenService実装
 * 既存の動作を保ちながら抽象化を導入
 */
class LocalStorageTokenService implements TokenService {
  private readonly TOKEN_KEY = 'authToken';

  /**
   * localStorageからJWT認証トークンを安全に取得
   */
  getToken(): string | null {
    try {
      return localStorage.getItem(this.TOKEN_KEY);
    } catch (error) {
      // localStorage無効時やプライベートブラウジング対応
      console.warn('トークン取得に失敗しました:', error);
      return null;
    }
  }

  /**
   * JWT認証トークンをlocalStorageに安全に保存
   */
  setToken(token: string): void {
    if (!token || typeof token !== 'string') {
      throw new Error('有効なトークンが必要です');
    }

    try {
      localStorage.setItem(this.TOKEN_KEY, token);
    } catch (error) {
      // ストレージ容量制限・プライベートブラウジング対応
      console.error('トークン保存に失敗しました:', error);
      throw new Error('トークンの保存に失敗しました');
    }
  }

  /**
   * 認証トークンをlocalStorageから安全に削除
   */
  removeToken(): void {
    try {
      localStorage.removeItem(this.TOKEN_KEY);
    } catch (error) {
      // localStorage例外時でも処理継続
      console.warn('トークン削除時にエラーが発生しました:', error);
    }
  }

  /**
   * トークンの存在と基本的な形式チェック
   */
  isTokenValid(): boolean {
    const token = this.getToken();

    if (!token) {
      return false;
    }

    // JWT基本形式チェック: "xxxxxx.xxxxxx.xxxxxx"形式の確認
    // 注意: 完全な署名検証は行わず、形式のみをチェック
    const jwtPattern = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
    return jwtPattern.test(token);
  }
}

/**
 * アプリケーション全体で単一のトークンサービスインスタンス
 */
export const tokenService: TokenService = new LocalStorageTokenService();

/**
 * テスト用または異なる実装のTokenService作成ファクトリー関数
 */
export const createTokenService = (
  implementation?: TokenService,
): TokenService => {
  return implementation || new LocalStorageTokenService();
};
