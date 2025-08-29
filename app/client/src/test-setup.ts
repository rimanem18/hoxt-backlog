import '@testing-library/jest-dom';

// DOM環境のセットアップ
declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}

// React DOM環境の模擬
if (!global.document) {
  const { JSDOM } = require('jsdom');
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
    url: 'http://localhost',
    pretendToBeVisual: true,
    resources: 'usable'
  });
  
  global.document = dom.window.document;
  global.window = dom.window as any;
  global.navigator = dom.window.navigator;
}