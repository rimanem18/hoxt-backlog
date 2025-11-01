/**
 * E2Eテスト用のグローバル型定義
 */

declare global {
  interface Window {
    /**
     * addInitScript実行確認フラグ
     * テストで addInitScript が正常に実行されたことを検証するために使用
     */
    __TEST_INIT_SCRIPT_RAN__?: boolean;
  }
}

export {};
