/**
 * TASK-302: トークン管理サービス（リファクタリング）
 * 【リファクタリング目的】: localStorage直接アクセスの依存性逆転原則（DIP）改善
 * 【設計改善】: トークン管理の抽象化による疎結合とテスト容易性向上
 * 【セキュリティ向上】: トークン操作の集中管理によるセキュリティ強化
 * 🟢 品質向上: SOLID原則の完全準拠
 */

/**
 * 【インターフェース定義】: トークン管理の抽象化による依存性逆転
 * 【設計意図】: 具象（localStorage）ではなく抽象（interface）に依存
 * 【拡張性】: 将来的なHttpOnly Cookie・セキュアストレージへの移行を容易に
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
 * 【LocalStorage実装】: 現在の実装との互換性を保つTokenService実装
 * 【リファクタリング戦略】: 既存の動作を保ちながら抽象化を導入
 * 【セキュリティ考慮】: 将来的なセキュア実装への移行準備
 * 🟢 改善点: 依存性の注入が可能な設計
 */
class LocalStorageTokenService implements TokenService {
  private readonly TOKEN_KEY = 'authToken';

  /**
   * 【トークン取得】: localStorageからJWT認証トークンを安全に取得
   * 【エラーハンドリング】: localStorage例外の適切な処理
   * 【戻り値保証】: 必ずstring | nullを返却
   */
  getToken(): string | null {
    try {
      return localStorage.getItem(this.TOKEN_KEY);
    } catch (error) {
      // 【例外処理】: localStorage無効時やプライベートブラウジング対応
      console.warn('トークン取得に失敗しました:', error);
      return null;
    }
  }

  /**
   * 【トークン保存】: JWT認証トークンをlocalStorageに安全に保存
   * 【バリデーション】: 空文字列・不正値の事前チェック
   * 【例外処理】: localStorage制限時の適切な処理
   */
  setToken(token: string): void {
    if (!token || typeof token !== 'string') {
      throw new Error('有効なトークンが必要です');
    }

    try {
      localStorage.setItem(this.TOKEN_KEY, token);
    } catch (error) {
      // 【例外処理】: ストレージ容量制限・プライベートブラウジング対応
      console.error('トークン保存に失敗しました:', error);
      throw new Error('トークンの保存に失敗しました');
    }
  }

  /**
   * 【トークン削除】: 認証トークンをlocalStorageから安全に削除
   * 【セキュリティ】: ログアウト時の確実なトークン削除
   * 【例外処理】: localStorage無効時の適切な処理
   */
  removeToken(): void {
    try {
      localStorage.removeItem(this.TOKEN_KEY);
    } catch (error) {
      // 【例外処理】: localStorage例外時でも処理継続
      console.warn('トークン削除時にエラーが発生しました:', error);
    }
  }

  /**
   * 【トークン有効性検証】: トークンの存在と基本的な形式チェック
   * 【セキュリティ】: 不正なトークンの早期検出
   * 【パフォーマンス】: JWTパースを避けた軽量な事前チェック
   */
  isTokenValid(): boolean {
    const token = this.getToken();

    if (!token) {
      return false;
    }

    // 【JWT基本形式チェック】: "xxxxxx.xxxxxx.xxxxxx"形式の確認
    // 【注意】: 完全な署名検証は行わず、形式のみをチェック
    const jwtPattern = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
    return jwtPattern.test(token);
  }
}

/**
 * 【シングルトンインスタンス】: アプリケーション全体で単一のトークンサービス
 * 【設計パターン】: ファクトリーパターンによる実装切り替え容易性
 * 【将来拡張】: 環境に応じたTokenService実装の切り替えが可能
 */
export const tokenService: TokenService = new LocalStorageTokenService();

/**
 * 【ファクトリー関数】: テスト用または異なる実装のTokenService作成
 * 【テスタビリティ】: 依存性注入によるテスト容易性向上
 * 【拡張性】: 将来的なSecureTokenService等の切り替えを容易に
 */
export const createTokenService = (
  implementation?: TokenService,
): TokenService => {
  return implementation || new LocalStorageTokenService();
};
