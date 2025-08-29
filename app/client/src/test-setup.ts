import '@testing-library/jest-dom';

// JSDOM環境のセットアップ
const { JSDOM } = require('jsdom');

// JSDOMのDOM環境を作成
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  url: 'http://localhost:3000',
  pretendToBeVisual: true,
  resources: 'usable'
});

const { window } = dom;

// すべての必要なオブジェクトをglobalに設定
Object.defineProperty(globalThis, 'window', {
  value: window,
  writable: true
});

Object.defineProperty(globalThis, 'document', {
  value: window.document,
  writable: true
});

Object.defineProperty(globalThis, 'navigator', {
  value: window.navigator,
  writable: true
});

// HTML要素を設定
Object.defineProperty(globalThis, 'HTMLElement', {
  value: window.HTMLElement,
  writable: true
});

Object.defineProperty(globalThis, 'HTMLButtonElement', {
  value: window.HTMLButtonElement,
  writable: true
});

Object.defineProperty(globalThis, 'HTMLImageElement', {
  value: window.HTMLImageElement,
  writable: true
});

Object.defineProperty(globalThis, 'Element', {
  value: window.Element,
  writable: true
});

Object.defineProperty(globalThis, 'Node', {
  value: window.Node,
  writable: true
});

// DOM イベント関連を設定
Object.defineProperty(globalThis, 'MouseEvent', {
  value: window.MouseEvent,
  writable: true
});

// Range とか Selection もセット
Object.defineProperty(globalThis, 'Range', {
  value: window.Range,
  writable: true
});

Object.defineProperty(globalThis, 'Selection', {
  value: window.Selection,
  writable: true
});

// requestAnimationFrame とか追加
Object.defineProperty(globalThis, 'requestAnimationFrame', {
  value: (callback: FrameRequestCallback) => setTimeout(callback, 0),
  writable: true
});

Object.defineProperty(globalThis, 'cancelAnimationFrame', {
  value: (id: number) => clearTimeout(id),
  writable: true
});

// グローバルの型宣言
declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
  var document: Document;
  var window: Window & typeof globalThis;
  var navigator: Navigator;
}