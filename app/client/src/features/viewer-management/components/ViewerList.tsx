'use client';

import React, { useState } from 'react';
import { FormAlert } from '@/shared/components/FormAlert';
import { useViewerManagementServices } from '../lib/ViewerManagementServicesContext';

/**
 * viewer一覧コンポーネント
 *
 * projectへ招待済みのviewer一覧を表示し、取り消し操作を提供する。
 * 取り消しは2段階の確認導線（取り消しボタン→取り消しますか？確認→確定/キャンセル）で行う。
 *
 * @example
 * ```tsx
 * <ViewerManagementServicesProvider>
 *   <ViewerList projectId={projectId} />
 * </ViewerManagementServicesProvider>
 * ```
 */
interface ViewerListProps {
  projectId: string;
}

function ViewerList(props: ViewerListProps): React.ReactNode {
  const { useProjectViewers, useRevokeViewer } = useViewerManagementServices();
  const {
    data: viewers,
    isLoading,
    error,
  } = useProjectViewers(props.projectId);
  const revokeViewer = useRevokeViewer();

  // 確認導線を表示中のviewerID（一覧内で1件のみ選択可能）
  const [confirmingViewerId, setConfirmingViewerId] = useState<string | null>(
    null,
  );
  const [revokeError, setRevokeError] = useState('');

  if (isLoading) {
    return (
      <div aria-live="polite">
        <span className="text-sm text-gray-500">読み込み中...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div aria-live="assertive">
        <span className="text-sm text-red-700">エラーが発生しました</span>
      </div>
    );
  }

  if (!viewers || viewers.length === 0) {
    return (
      <div aria-live="polite">
        <span className="text-sm text-gray-500">
          招待済みの閲覧者はいません
        </span>
      </div>
    );
  }

  const handleRevoke = (viewerId: string) => {
    setRevokeError('');
    revokeViewer.mutate(
      { projectId: props.projectId, viewerId },
      {
        onSuccess: () => {
          setConfirmingViewerId(null);
        },
        onError: (err: Error) => {
          setRevokeError(err.message);
        },
      },
    );
  };

  return (
    <div className="flex flex-col gap-2 sm:gap-3">
      {viewers.map((viewer) => (
        <div
          key={viewer.id}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3 sm:px-4 py-2 border border-gray-200 rounded-lg"
        >
          <span className="text-sm sm:text-base min-w-0 break-all">
            {viewer.email}
          </span>

          {confirmingViewerId === viewer.id ? (
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <span className="text-sm">取り消しますか？</span>
              <button
                type="button"
                className="px-3 py-1 text-sm bg-red-600 text-white rounded-lg hover:bg-opacity-80 disabled:opacity-50 transition-colors"
                disabled={revokeViewer.isPending}
                onClick={() => handleRevoke(viewer.id)}
              >
                取り消す
              </button>
              <button
                type="button"
                className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 transition-colors"
                disabled={revokeViewer.isPending}
                onClick={() => setConfirmingViewerId(null)}
              >
                キャンセル
              </button>
            </div>
          ) : (
            <button
              type="button"
              aria-label={`${viewer.email}への招待を取り消す`}
              className="self-start sm:self-auto shrink-0 px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 transition-colors"
              disabled={revokeViewer.isPending}
              onClick={() => setConfirmingViewerId(viewer.id)}
            >
              取り消し
            </button>
          )}
        </div>
      ))}

      {revokeError && <FormAlert variant="error" message={revokeError} />}
    </div>
  );
}

export default React.memo(ViewerList);
