'use client';

import { useEffect, useState } from 'react';
import { useConfirmPageServices } from '@/app/auth/confirm/ConfirmPageServicesContext';

type ConfirmStatus = 'loading' | 'success' | 'error';

/**
 * メールアドレス確認ページ
 *
 * URLのcodeパラメータを使ってメールアドレスの確認を行い、
 * 結果に応じて成功・失敗メッセージを表示する。
 * 本番環境では ConfirmPageServicesProvider でラップすること。
 */
export default function EmailConfirmPage(): React.ReactNode {
  const services = useConfirmPageServices();
  const { exchangeCode, code } = services ?? {};

  const [confirmStatus, setConfirmStatus] = useState<ConfirmStatus>(
    code ? 'loading' : 'error',
  );

  useEffect(() => {
    if (!code || !exchangeCode) {
      return;
    }

    exchangeCode(code)
      .then((result) => {
        if (result.error) {
          setConfirmStatus('error');
        } else {
          setConfirmStatus('success');
        }
      })
      .catch(() => {
        setConfirmStatus('error');
      });
  }, [code, exchangeCode]);

  if (confirmStatus === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 text-center space-y-4">
          <p className="text-gray-700">メールアドレスの確認が完了しました</p>
          <a href="/" className="block text-primary hover:underline">
            ホームへ
          </a>
        </div>
      </div>
    );
  }

  if (confirmStatus === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 text-center">
          <p className="text-red-600">確認リンクが無効か期限切れです</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 text-center">
        <p className="text-gray-600">確認中...</p>
      </div>
    </div>
  );
}
