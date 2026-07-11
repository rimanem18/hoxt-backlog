import { afterEach, describe, expect, test } from 'bun:test';
import { cleanup, render, screen } from '@testing-library/react';
import { InitialAvatar } from '@/features/auth/components/InitialAvatar';

describe('InitialAvatar', () => {
  afterEach(() => {
    cleanup();
  });

  test('nameの先頭文字がSVG内に表示される', () => {
    // Given: 表示対象の名前
    const name = '山田太郎';

    // When: InitialAvatarをレンダリング
    render(<InitialAvatar name={name} />);

    // Then: 先頭1文字がテキストとして表示される
    expect(screen.getByText('山')).toBeTruthy();
  });

  test('aria-labelにプロフィール画像である旨が設定される', () => {
    // Given: 表示対象の名前
    const name = 'テストユーザー';

    // When: InitialAvatarをレンダリング
    render(<InitialAvatar name={name} />);

    // Then: 名前を含むaria-labelを持つimgロールが存在する
    const avatar = screen.getByRole('img', {
      name: 'テストユーザーのプロフィール画像',
    });
    expect(avatar).toBeTruthy();
  });

  test('classNameがルート要素に付与される', () => {
    // Given: 任意のclassName
    const name = 'テストユーザー';

    // When: classNameを指定してレンダリング
    render(<InitialAvatar name={name} className="rounded-full mb-4" />);

    // Then: ルート要素にclassNameが反映される
    const avatar = screen.getByRole('img', {
      name: 'テストユーザーのプロフィール画像',
    });
    expect(avatar.getAttribute('class')).toContain('rounded-full');
    expect(avatar.getAttribute('class')).toContain('mb-4');
  });

  test('sizeを指定するとルート要素の幅と高さに反映される', () => {
    // Given: sizeを32に指定
    const name = 'テストユーザー';

    // When: sizeを指定してレンダリング
    render(<InitialAvatar name={name} size={32} />);

    // Then: 幅と高さがsizeの値になる
    const avatar = screen.getByRole('img', {
      name: 'テストユーザーのプロフィール画像',
    });
    expect(avatar.getAttribute('width')).toBe('32');
    expect(avatar.getAttribute('height')).toBe('32');
  });
});
