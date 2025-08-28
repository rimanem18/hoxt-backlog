/**
 * 【機能概要】: ユーザー関連の型定義とインターフェース
 * 【実装方針】: テストケースで参照される最小限のUser型定義を提供
 * 【テスト対応】: auth.tsからの参照を解決するための再エクスポート
 * 🟢 信頼性レベル: interfaces.ts・domain/user/UserEntityから直接抽出
 */

// auth.tsで定義されたUser型を再エクスポート
export type { User, AuthProvider } from './auth.js';

/**
 * 【再エクスポート理由】: テストファイルがauth.tsとuser.tsの両方から
 * User型を参照できるようにするための互換性確保
 */