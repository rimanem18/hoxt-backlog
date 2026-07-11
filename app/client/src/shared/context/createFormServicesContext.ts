import { createContext, useContext } from 'react';

/**
 * フォーム用Services Contextを生成するファクトリ
 *
 * *FormServicesContext.tsx 各ファイルで重複していた
 * createContext / useContext のthrowチェックを共通化する。
 *
 * @param hookName - Provider外で呼び出された際のエラーメッセージに使うフック名
 */
export function createFormServicesContext<T>(hookName: string) {
  const Context = createContext<T | null>(null);

  function useFormServices(): T {
    const services = useContext(Context);
    if (!services) {
      throw new Error(
        `${hookName} must be used within its corresponding Provider. ` +
          'Wrap your component with the corresponding ServicesProvider.',
      );
    }
    return services;
  }

  return { Context, useFormServices };
}
