/**
 * 【型安全Redux Hook】: useSelector・useDispatchの型安全版
 * 【設計方針】: アプリケーション全体で一貫した型安全性を確保
 * 【利便性】: 各コンポーネントでの型アサーション作業を削減
 * 🟢 信頼性レベル: Redux Toolkit公式推奨パターンによる確実な実装
 */

import {
  type TypedUseSelectorHook,
  useDispatch,
  useSelector,
} from 'react-redux';
import type { AppDispatch, RootState } from './index';

/**
 * 【型安全useDispatch】: AppDispatch型を適用したuseDispatch
 * 【用途】: アクション実行時の型推論とIDE補完支援
 * 【使用例】: const dispatch = useAppDispatch();
 */
export const useAppDispatch = () => useDispatch<AppDispatch>();

/**
 * 【型安全useSelector】: RootState型を適用したuseSelector
 * 【用途】: state選択時の型推論とプロパティ補完
 * 【使用例】: const user = useAppSelector(state => state.auth.user);
 */
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

/**
 * 【型定義エクスポート】: 外部モジュールでの型参照用
 * 【拡張性】: カスタムフックや高階コンポーネントでの活用
 */
export type { AppDispatch, RootState } from './index';
