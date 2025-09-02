/**
 * UserServiceContext: ユーザーサービスへの依存性注入（DI）を実現するContext
 *
 * 機能概要:
 * - UserServiceInterfaceに準拠したサービスインスタンスをReactコンポーネントツリーに提供
 * - デフォルトで本番用のuserServiceインスタンスを提供
 * - テスト時にはモックサービスを注入可能にし、コンポーネントとサービスの疎結合を実現
 *
 * 実装パターン:
 * - React Context APIを使用したDIコンテナパターン
 * - カスタムフック（useUserService）による型安全なサービスアクセス
 */
import { createContext, useContext, type ReactNode } from 'react';
import {
  userService,
  type UserServiceInterface,
} from '../services/userService';

// 1. Contextの作成（デフォルト値として本番サービスを設定）
const UserServiceContext =
  createContext<UserServiceInterface>(userService);

// 2. Contextからサービスを取得するためのカスタムフック
/**
 * コンポーネントツリーからUserServiceのインスタンスを取得する
 * @returns UserServiceInterfaceの実装インスタンス
 */
export const useUserService = (): UserServiceInterface => {
  return useContext(UserServiceContext);
};

// 3. Contextにサービスを提供するためのプロバイダーコンポーネント
interface UserServiceProviderProps {
  children: ReactNode;
  /** DIするUserServiceのインスタンス（テスト時に使用） */
  value?: UserServiceInterface;
}

// テスト用の明示的な型定義
interface TestUserServiceProviderProps {
  children: ReactNode;
  /** テスト用DIサービス（必須） */
  value: UserServiceInterface;
}

/**
 * UserServiceをDIするためのプロバイダー
 * @param children - プロバイダー配下の子コンポーネント
 * @param value - 注入するサービスインスタンス（指定がなければ本番用を使用）
 */
export const UserServiceProvider = ({
  children,
  value = userService,
}: UserServiceProviderProps) => {
  return (
    <UserServiceContext.Provider value={value}>
      {children}
    </UserServiceContext.Provider>
  );
};