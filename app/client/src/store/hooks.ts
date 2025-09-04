/**
 * useSelector・useDispatchの型安全版
 * アプリケーション全体で一貫した型安全性を確保
 */

import {
  type TypedUseSelectorHook,
  useDispatch,
  useSelector,
} from 'react-redux';
import type { AppDispatch, RootState } from './index';

/**
 * AppDispatch型を適用したuseDispatch
 * @example const dispatch = useAppDispatch();
 */
export const useAppDispatch = () => useDispatch<AppDispatch>();

/**
 * RootState型を適用したuseSelector
 * @example const user = useAppSelector(state => state.auth.user);
 */
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

/**
 * 外部モジュールでの型参照用エクスポート
 */
export type { AppDispatch, RootState } from './index';
