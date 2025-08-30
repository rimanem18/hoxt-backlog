import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { render, screen, cleanup } from '@testing-library/react';
import { UserProfile } from '../components/UserProfile';
import { User } from '@/packages/shared-schemas/src/auth';

// 【テストファイル名】: UserProfile.test.ts
// 【テストスコープ】: 認証済みユーザープロフィール表示コンポーネント
// 【テスト対象機能】: ユーザー情報表示、アバター画像フォールバック処理

describe('UserProfile', () => {
  beforeEach(() => {
    // 【テスト前準備】: 各テスト実行前にコンポーネントstate、画像ロードモックを初期化
    // 【環境初期化】: 前のテストの影響を受けないよう、DOMとイベントハンドラーをクリーンアップ
  });

  afterEach(() => {
    // 【テスト後処理】: テスト実行後に画像要素のイベントリスナーをクリアし、メモリリークを防止
    // 【状態復元】: 次のテストに影響しないよう、コンポーネント状態をリセット
    cleanup(); // DOMをクリーンアップして次のテストへの影響を防ぐ
  });

  test('認証済みユーザー情報の表示', () => {
    // 【テスト目的】: 認証済み時のユーザー情報表示が正しく動作することを確認
    // 【テスト内容】: ユーザー情報の画面表示とフォーマット処理をテスト
    // 【期待される動作】: 名前、メール、アバター画像、ログアウトボタンの適切な表示
    // 🟢 要件REQ-104（認証済みUI表示）・User型定義から直接抽出

    // 【テストデータ準備】: バックエンドAPIから取得したユーザープロフィール情報を模擬
    // 【初期条件設定】: 認証済み状態で完全なユーザー情報が設定された状態を想定
    const mockUser: User = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      externalId: "google_123456789",
      provider: "google" as const,
      email: "user@example.com",
      name: "山田太郎",
      avatarUrl: "https://lh3.googleusercontent.com/a/avatar.jpg",
      createdAt: "2025-08-29T10:30:00.000Z",
      updatedAt: "2025-08-29T10:30:00.000Z",
      lastLoginAt: "2025-08-29T13:45:00.000Z"
    };

    // TODO(human): UserProfileコンポーネントの実装が必要
    // 【実際の処理実行】: UserProfileコンポーネントをユーザー情報付きでレンダリング
    // 【処理内容】: ユーザー情報の画面表示処理を実行し、各要素がDOMに正しく配置される
    render(<UserProfile user={mockUser} />);

    // 【結果検証】: ユーザー名が正しく表示されることを確認
    // 【期待値確認】: 名前フィールドが期待値で表示され、データバインディングが正常動作
    expect(screen.getByText("山田太郎")).toBeTruthy(); // 【確認内容】: ユーザー名が正しく表示されることを確認 🟢

    // 【結果検証】: メールアドレスが正しく表示されることを確認  
    // 【期待値確認】: メールフィールドが期待値で表示され、フォーマットが適切
    expect(screen.getByText("user@example.com")).toBeTruthy(); // 【確認内容】: メールアドレスが正しく表示されることを確認 🟢

    // 【結果検証】: アバター画像が正しい属性で表示されることを確認
    // 【期待値確認】: img要素のsrc属性とalt属性が適切に設定される
    const avatarImage = screen.getByRole('img', { name: /プロフィール画像/i });
    expect(avatarImage.getAttribute('src')).toBe("https://lh3.googleusercontent.com/a/avatar.jpg"); // 【確認内容】: アバター画像のURLが正しく設定されることを確認 🟢

    // 【結果検証】: ログアウトボタンが表示されることを確認
    // 【期待値確認】: 認証済みユーザーに対してログアウト機能が提供される
    expect(screen.getByRole('button', { name: 'ログアウト' })).toBeTruthy(); // 【確認内容】: ログアウトボタンが正しく表示されることを確認 🟢
  });

  test('アバター画像フォールバック処理', () => {
    // 【テスト目的】: アバター画像取得失敗時のフォールバック機能が正しく動作することを確認
    // 【テスト内容】: 画像読み込みエラー時のデフォルト画像表示処理をテスト
    // 【期待される動作】: デフォルトアバター画像の表示、エラー状態の非表示、UI崩れ防止
    // 🟢 要件EDGE-102（アバター画像取得失敗）から直接抽出

    // 【テストデータ準備】: Google OAuthでアバター画像が提供されないケースを模擬
    // 【初期条件設定】: avatarUrlがnullのユーザー情報を設定
    const mockUserWithoutAvatar: User = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      externalId: "google_123456789", 
      provider: "google" as const,
      email: "user@example.com",
      name: "テストユーザー",
      avatarUrl: null,
      createdAt: "2025-08-29T10:30:00.000Z",
      updatedAt: "2025-08-29T10:30:00.000Z",
      lastLoginAt: "2025-08-29T13:45:00.000Z"
    };

    // TODO(human): UserProfileコンポーネントでのnull値処理実装が必要
    // 【実際の処理実行】: avatarUrl=nullでUserProfileコンポーネントをレンダリング
    // 【処理内容】: null値に対するフォールバック処理を実行し、デフォルト画像表示を確認
    render(<UserProfile user={mockUserWithoutAvatar} />);

    // 【結果検証】: デフォルトアバター画像が表示されることを確認
    // 【期待値確認】: null値の場合にデフォルト画像パスが使用され、alt属性も適切に設定
    const avatarImage = screen.getByRole('img', { name: /プロフィール画像/i });
    expect(avatarImage.getAttribute('src')).toContain('/default-avatar.png'); // 【確認内容】: デフォルトアバター画像が正しく表示されることを確認 🟢

    // 【結果検証】: ユーザー名とメールアドレスは正常に表示されることを確認
    // 【期待値確認】: アバター画像なしでも他の情報表示に影響がないことを保証
    expect(screen.getByText("テストユーザー")).toBeTruthy(); // 【確認内容】: アバター画像がなくてもユーザー名は正常表示されることを確認 🟢
    expect(screen.getByText("user@example.com")).toBeTruthy(); // 【確認内容】: アバター画像がなくてもメールアドレスは正常表示されることを確認 🟢
  });
});