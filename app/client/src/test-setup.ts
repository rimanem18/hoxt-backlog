import '@testing-library/jest-dom';

// テスト環境用のSupabase環境変数を設定
// 実際のSupabaseには接続せず、テスト専用の値を使用
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test-supabase-url.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key-for-testing';

// JSDOM環境のセットアップ
const { JSDOM } = require('jsdom');

// JSDOMのDOM環境を作成
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  url: 'http://localhost:3000',
  pretendToBeVisual: true,
  resources: 'usable',
});

const { window } = dom;

// すべての必要なオブジェクトをglobalに設定
Object.defineProperty(globalThis, 'window', {
  value: window,
  writable: true,
});

Object.defineProperty(globalThis, 'document', {
  value: window.document,
  writable: true,
});

Object.defineProperty(globalThis, 'navigator', {
  value: window.navigator,
  writable: true,
});

// HTML要素を設定
Object.defineProperty(globalThis, 'HTMLElement', {
  value: window.HTMLElement,
  writable: true,
});

Object.defineProperty(globalThis, 'HTMLButtonElement', {
  value: window.HTMLButtonElement,
  writable: true,
});

Object.defineProperty(globalThis, 'HTMLImageElement', {
  value: window.HTMLImageElement,
  writable: true,
});

Object.defineProperty(globalThis, 'Element', {
  value: window.Element,
  writable: true,
});

Object.defineProperty(globalThis, 'Node', {
  value: window.Node,
  writable: true,
});

// DOM イベント関連を設定
// DOM 環境に存在しない Web API を明示的に設定
Object.defineProperty(globalThis, 'MouseEvent', {
  value: window.MouseEvent,
  writable: true,
});

// RangeとSelectionはテキスト選択操作のテストで必要になるWeb API
Object.defineProperty(globalThis, 'Range', {
  value: window.Range,
  writable: true,
});

Object.defineProperty(globalThis, 'Selection', {
  value: window.Selection,
  writable: true,
});

// アニメーションのテストに必要なrequestAnimationFrameを設定
Object.defineProperty(globalThis, 'requestAnimationFrame', {
  value: (callback: FrameRequestCallback) => setTimeout(callback, 0),
  writable: true,
});

Object.defineProperty(globalThis, 'cancelAnimationFrame', {
  value: (id: number) => clearTimeout(id),
  writable: true,
});

// 【localStorage モック設定】: テスト環境でのlocalStorage機能提供
// 【機能概要】: Redux authSliceで使用するlocalStorageをテスト環境でモック化
// 【実装方針】: メモリベースのストレージで実際のlocalStorageの動作をシミュレート
// 【テスト対応】: T005, T006の認証状態管理テストに必要
// 🟢 信頼性レベル: Web標準APIの標準的なモック実装

class MockStorage implements Storage {
  private store: Record<string, string> = {};

  get length(): number {
    return Object.keys(this.store).length;
  }

  key(index: number): string | null {
    const keys = Object.keys(this.store);
    return keys[index] || null;
  }

  getItem(key: string): string | null {
    return this.store[key] || null;
  }

  setItem(key: string, value: string): void {
    this.store[key] = value;
  }

  removeItem(key: string): void {
    delete this.store[key];
  }

  clear(): void {
    this.store = {};
  }
}

// localStorageをグローバルに設定
Object.defineProperty(globalThis, 'localStorage', {
  value: new MockStorage(),
  writable: true,
});

// グローバルの型宣言
declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: Record<string, unknown>;
    }
  }
}
