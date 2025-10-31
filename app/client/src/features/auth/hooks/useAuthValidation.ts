'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import {
  clearStoredAuth,
  validateStoredAuth,
} from '@/shared/utils/authValidation';

/**
 * 認証状態の検証フック
 *
 * AuthGuardコンポーネント内で使用し、保護されたページのマウント時に
 * localStorageの認証情報を検証する。
 *
 * 期限切れや無効なトークンを検出した場合、ルートページにリダイレクトする。
 *
 * @example
 * ```tsx
 * function AuthGuard({ children }: { children: React.ReactNode }) {
 *   useAuthValidation();
 *   return <>{children}</>;
 * }
 * ```
 */
export function useAuthValidation() {
  const router = useRouter();
  const hasValidated = useRef(false);

  useEffect(() => {
    // 二重実行を防止
    if (hasValidated.current) {
      return;
    }

    hasValidated.current = true;

    const validationResult = validateStoredAuth();

    if (!validationResult.isValid) {
      // 無効な認証情報をlocalStorageから削除
      clearStoredAuth();

      // 期限切れまたは無効なトークンの場合、ルートページにリダイレクト
      // TODO: トースト通知を追加（現在はトーストライブラリ未導入のため省略）
      // トースト文言例: "セッションが切れました。再度ログインしてください"

      console.log(
        '[useAuthValidation] Invalid auth detected, redirecting to home',
        { reason: validationResult.reason },
      );

      router.replace('/');
    }
  }, [router]);
}
