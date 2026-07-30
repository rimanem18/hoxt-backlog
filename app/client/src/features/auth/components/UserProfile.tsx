/**
 * 認証済みユーザーのプロフィール情報を表示し、ログアウト機能を提供するコンポーネント。
 * 静的な表示は UserProfileView に、ログアウト操作は LogoutButton に委譲する
 * Composition パターンで構成する。
 *
 * @example
 * ```tsx
 * <UserProfile user={authenticatedUser} />
 * ```
 */

import type React from 'react';
import { LogoutButton } from '@/features/auth/components/LogoutButton';
import { UserProfileView } from '@/features/auth/components/UserProfileView';
import type { User } from '@/packages/shared-schemas/src/auth';

/**
 * UserProfileコンポーネントのProps型定義
 */
interface UserProfileProps {
  /** 表示対象のユーザー情報 */
  user: User;
}

/**
 * ユーザープロフィール表示コンポーネント
 *
 * @param props - UserProfilePropsオブジェクト
 * @returns {React.ReactNode} ユーザープロフィール表示要素
 */
export const UserProfile: React.FC<UserProfileProps> = (props) => {
  return (
    <UserProfileView user={props.user}>
      <LogoutButton />
    </UserProfileView>
  );
};
