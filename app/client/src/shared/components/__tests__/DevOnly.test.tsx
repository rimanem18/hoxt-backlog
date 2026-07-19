import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { cleanup, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DevOnly } from '../DevOnly';

describe('DevOnly', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    cleanup();
    mock.restore();
    mock.clearAllMocks();
  });

  test('開発環境の場合にchildrenが描画される', () => {
    // Given: 開発環境
    process.env.NODE_ENV = 'development';

    // When: DevOnlyをレンダリング
    render(
      <DevOnly>
        <div>DEV_ONLY_CHILD</div>
      </DevOnly>,
    );

    // Then: childrenが描画される
    expect(screen.getByText('DEV_ONLY_CHILD')).toBeInTheDocument();
  });

  test('本番環境の場合にchildrenが描画されない', () => {
    // Given: 本番環境
    process.env.NODE_ENV = 'production';

    // When: DevOnlyをレンダリング
    render(
      <DevOnly>
        <div>DEV_ONLY_CHILD</div>
      </DevOnly>,
    );

    // Then: childrenが描画されない
    expect(screen.queryByText('DEV_ONLY_CHILD')).not.toBeInTheDocument();
  });
});
