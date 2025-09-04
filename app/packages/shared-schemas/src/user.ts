/**
 * ユーザー関連の型定義とインターフェース
 * テストケースで参照される最小限のUser型定義を提供
 */

// auth.tsで定義されたUser型を再エクスポート
export type { User, AuthProvider } from './auth.js';

/**
 * 再エクスポート理由
 * テストファイルがauth.tsとuser.tsの両方からUser型を参照できるようにするための互換性確保
 */