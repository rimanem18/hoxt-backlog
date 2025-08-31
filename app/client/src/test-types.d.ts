/// <reference types="@testing-library/jest-dom" />

// Bunテストの追加型定義
import type { expect } from 'bun:test';

declare global {
  // jest-domのカスタムマッチャーを追加
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R;
      toBeDisabled(): R;
      toHaveTextContent(text: string | RegExp): R;
      toHaveAttribute(attr: string, value?: string | RegExp): R;
    }
  }
}