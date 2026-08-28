'use client';

import { inviteViewerSchema } from '@hoxt-backlog/shared-schemas/viewers';
import React, { useState } from 'react';
import { FormAlert } from '@/shared/components/FormAlert';
import { useViewerManagementServices } from '../lib/ViewerManagementServicesContext';

/**
 * viewer招待フォームコンポーネント
 *
 * projectの作成者がメールアドレスを入力してviewerを招待するための
 * フォーム。クライアント側バリデーション（メール形式エラー表示）と
 * エラー・成功メッセージ表示機能を提供する。
 *
 * @example
 * ```tsx
 * <ViewerManagementServicesProvider>
 *   <ViewerInviteForm projectId={projectId} />
 * </ViewerManagementServicesProvider>
 * ```
 */
interface ViewerInviteFormProps {
  projectId: string;
}

function ViewerInviteForm(props: ViewerInviteFormProps): React.ReactNode {
  const { useInviteViewer } = useViewerManagementServices();
  const inviteViewer = useInviteViewer();

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // エラー・成功メッセージクリア
    setError('');
    setSuccess(false);

    // クライアント側バリデーション：API契約と同一のZodスキーマで検証
    const result = inviteViewerSchema.shape.email.safeParse(email);
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? '');
      return;
    }

    inviteViewer.mutate(
      { projectId: props.projectId, email: result.data },
      {
        onSuccess: () => {
          setEmail('');
          setError('');
          setSuccess(true);
        },
        onError: (err: Error) => {
          setError(err.message);
        },
      },
    );
  };

  return (
    <div className="mb-4 sm:mb-6">
      <form
        onSubmit={handleSubmit}
        noValidate
        className="flex flex-col gap-3 sm:gap-4"
      >
        <div className="flex flex-col gap-1">
          <label
            htmlFor="viewer-invite-email"
            className="text-sm sm:text-base font-medium"
          >
            招待するメールアドレス
          </label>
          <input
            id="viewer-invite-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        <button
          type="submit"
          className="px-4 sm:px-6 py-2 text-sm sm:text-base bg-primary text-white rounded-lg hover:bg-opacity-80 disabled:opacity-50 transition-colors whitespace-nowrap"
          disabled={inviteViewer.isPending}
        >
          招待する
        </button>
      </form>

      {error && (
        <FormAlert variant="error" message={error} className="mt-2 sm:mt-3" />
      )}

      {success && (
        <FormAlert
          variant="success"
          message="招待メールを送信しました"
          className="mt-2 sm:mt-3"
        />
      )}
    </div>
  );
}

export default React.memo(ViewerInviteForm);
