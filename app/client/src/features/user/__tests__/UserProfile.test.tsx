import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { User } from '@/packages/shared-schemas/src/auth';
import { UserProfile } from '../components/UserProfile';
import { UserServiceProvider } from '../contexts/UserServiceContext';
import type { UserServiceInterface } from '../services/userService';

// 【Context DI用モック】: UserServiceモックのみを保持、useUserProfileは実物を使用
let mockUserService: UserServiceInterface;

// 【Context DI移行】: mock.module()を廃止しContext経由でDIを実現
// 【独立性向上】: グローバルモック汚染を根本解決

describe('TASK-302: ユーザープロフィール表示実装', () => {
  beforeEach(() => {
    // 【Context DI環境構築】: 各テスト用の独立 UserService モック作成
    // 【完全分離保証】: グローバル状態に一切依存しない独立環境
    const mockGetUserProfile = mock().mockName(
      `userprofile-test-${Date.now()}`,
    );

    mockUserService = {
      getUserProfile: mockGetUserProfile,
    };
  });

  afterEach(() => {
    // 【テスト後処理】: メモリリーク防止とグローバル状態のクリーンアップ
    // 【状態復元】: 次テスト実行への影響排除と安定した継続実行環境の維持
    cleanup();
  });

  // ===== 1. 正常系テストケース（基本的な動作） =====

  test('1-1. 認証済みユーザーの完全なプロフィール情報表示', async () => {
    // 【テスト目的】: TASK-302チェックリスト要件のプロフィール表示機能検証
    // 【テスト内容】: 全てのユーザー情報（名前・メール・アバター・最終ログイン日時）の正確な表示
    // 【期待される動作】: User型オブジェクトの各プロパティが適切にUIにレンダリングされる
    // 🟢 既存User型定義・実装パターンに基づく高信頼性

    // 【テストデータ準備】: プロダクション環境で想定される標準的なユーザーデータ
    // 【初期条件設定】: 完全なUser型オブジェクト（lastLoginAt含む）でAPIから正常取得
    const mockUser: User = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      externalId: 'google_123456789',
      provider: 'google' as const,
      email: 'user@example.com',
      name: '山田太郎',
      avatarUrl: 'https://example.com/avatar.jpg',
      createdAt: '2025-08-29T10:30:00.000Z',
      updatedAt: '2025-08-29T10:30:00.000Z',
      lastLoginAt: '2025-09-01T10:30:00.000Z',
    };

    // 【Context DI設定】: UserServiceモックで成功レスポンスを返すよう設定
    mockUserService.getUserProfile.mockResolvedValue(mockUser);

    // 【Context DI実行】: UserServiceProvider経由でモックサービスを注入
    // 【完全分離処理】: グローバル依存ゼロでのコンポーネントテスト
    render(
      <UserServiceProvider value={mockUserService}>
        <UserProfile />
      </UserServiceProvider>,
    );

    // 【非同期待機】: Context DI経由でのuseUserProfileのデータ取得完了を待つ
    // 【Context DI対応】: 実際のフックが非同期でモックデータを取得するまで待機
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 2, name: '山田太郎' }),
      ).toBeTruthy(); // 【確認内容】: 名前が適切なh2見出しで表示されること 🟢
    });
    expect(screen.getByText('user@example.com')).toBeTruthy(); // 【確認内容】: メールアドレスが正確に表示されること 🟢

    const avatarImage = screen.getByRole('img', { name: /プロフィール画像/i });
    expect(avatarImage).toBeTruthy(); // 【確認内容】: アバター画像が適切なalt属性で表示されること 🟢
    expect(avatarImage.getAttribute('width')).toBe('64'); // 【確認内容】: アバター画像のサイズが仕様通り64x64pxであること 🟢

    expect(screen.getByText(/2025年9月1日.*19:30/)).toBeTruthy(); // 【確認内容】: 最終ログイン日時の日本語ローカライズ表示確認 🟢
  });

  test('1-2. プロフィール取得中のスケルトンUI表示', () => {
    // 【テスト目的】: データ取得中の適切なローディング状態表示確認
    // 【テスト内容】: データ取得処理中にユーザーフレンドリーなスケルトンUIが表示される
    // 【期待される動作】: ローディング状態でスケルトンプレースホルダーが各要素に表示される
    // 🟡 チェックリスト要件から設計、妥当な推測

    // 【テストデータ準備】: API呼び出し中の非同期状態をシミュレート
    // 【初期条件設定】: loading: true状態のuseUserProfileフック
    // 【Context DI設定】: UserServiceで遅延をシミュレート
    mockUserService.getUserProfile.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(mockUser), 1000)),
    );

    // 【実際の処理実行】: ローディング状態でのUserProfileコンポーネントレンダリング
    // 【処理内容】: スケルトンUI表示処理の確認
    render(
      <UserServiceProvider value={mockUserService}>
        <UserProfile />
      </UserServiceProvider>,
    );

    // 【結果検証】: スケルトンUI表示とアクセシビリティの確認
    // 【期待値確認】: ユーザビリティ向上、体感パフォーマンス改善の確認
    expect(screen.getByRole('status', { name: /読み込み中/i })).toBeTruthy(); // 【確認内容】: ローディング状態のaria-live通知機能確認 🟡
    expect(screen.getByTestId('avatar-skeleton')).toBeTruthy(); // 【確認内容】: アバター用円形スケルトンプレースホルダー表示 🟡
    expect(screen.getByTestId('name-skeleton')).toBeTruthy(); // 【確認内容】: 名前用長方形スケルトンプレースホルダー表示 🟡
    expect(screen.getByTestId('email-skeleton')).toBeTruthy(); // 【確認内容】: メール用長方形スケルトンプレースホルダー表示 🟡
    expect(screen.getByTestId('lastlogin-skeleton')).toBeTruthy(); // 【確認内容】: 最終ログイン日時用スケルトンプレースホルダー表示 🟡
  });

  test('1-3. 各画面サイズでの適切なレスポンシブレイアウト表示', () => {
    // 【テスト目的】: モバイル対応の品質確認
    // 【テスト内容】: タブレット・スマートフォンでの最適化表示
    // 【期待される動作】: 画面サイズに応じて適切にレイアウトが調整される
    // 🟢 チェックリスト明示要件による高信頼性

    // 【テストデータ準備】: 主要なブレークポイントでの表示確認
    // 【初期条件設定】: 通常のユーザー情報で各サイズテスト
    const mockUser: User = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      externalId: 'google_123456789',
      provider: 'google' as const,
      email: 'user@example.com',
      name: '山田太郎',
      avatarUrl: 'https://example.com/avatar.jpg',
      createdAt: '2025-08-29T10:30:00.000Z',
      updatedAt: '2025-08-29T10:30:00.000Z',
      lastLoginAt: '2025-09-01T10:30:00.000Z',
    };

    // 【Context DI設定】: UserServiceモックで成功レスポンスを返すよう設定
    mockUserService.getUserProfile.mockResolvedValue(mockUser);

    // 【実際の処理実行】: ローディング状態でのUserProfileコンポーネントレンダリング
    // 【処理内容】: スケルトンUI表示処理の確認
    render(
      <UserServiceProvider value={mockUserService}>
        <UserProfile />
      </UserServiceProvider>,
    );

    // 【結果検証】: レスポンシブ設計要件、ユーザビリティ確保
    // 【期待値確認】: 各サイズで適切な余白・フォントサイズ・レイアウト
    const container = screen.getByTestId('user-profile-container');
    expect(container).toHaveClass('responsive-container'); // 【確認内容】: レスポンシブコンテナクラスの適用確認 🟢

    const avatarImage = screen.getByRole('img', { name: /プロフィール画像/i });
    expect(avatarImage).toHaveClass('responsive-avatar'); // 【確認内容】: レスポンシブアバタークラスの適用確認 🟢
  });

  // ===== 2. 異常系テストケース（エラーハンドリング） =====

  test('2-1. バックエンドAPI通信失敗時のエラー表示と再試行機能', async () => {
    // 【テスト目的】: エラーハンドリングの適切性確認
    // 【テスト内容】: /api/user/profileエンドポイントへの通信が失敗した場合
    // 【期待される動作】: ユーザーにとって分かりやすいエラー表示と復旧手段の提供
    // 🟡 一般的なAPI通信エラーパターンからの妥当な推測

    // 【テストデータ準備】: サーバー内部エラーによる一時的な通信障害をシミュレート
    // 【初期条件設定】: API呼び出しで500 Internal Server Errorをモック
    // 【Context DI設定】: UserServiceでエラーを投げる
    mockUserService.getUserProfile.mockRejectedValue(
      new Error('プロフィール情報の取得に失敗しました'),
    );

    // 【実際の処理実行】: エラー状態でのコンポーネントレンダリング
    // 【処理内容】: エラーハンドリングとリカバリ機能の動作確認
    render(
      <UserServiceProvider value={mockUserService}>
        <UserProfile />
      </UserServiceProvider>,
    );

    // 【結果検証】: エラー表示とユーザビリティの確認
    // 【期待値確認】: 品質保証の観点でユーザーが迷わず復旧できるUX設計
    expect(screen.getByRole('alert')).toBeTruthy(); // 【確認内容】: エラー状態のaria-role="alert"設定確認 🟡
    expect(
      screen.getByText('プロフィール情報の取得に失敗しました'),
    ).toBeTruthy(); // 【確認内容】: 技術的詳細を隠した分かりやすい日本語エラーメッセージ 🟡

    const retryButton = screen.getByRole('button', { name: /再試行/i });
    expect(retryButton).toBeTruthy(); // 【確認内容】: 再試行ボタンの表示確認 🟡

    // 【ユーザー操作実行】: 再試行ボタンクリックのテスト
    // 【操作内容】: ユーザーによる復旧操作の確認
    const user = userEvent.setup();
    await user.click(retryButton);

    // 【操作結果確認】: 再試行機能の動作確認
    expect(mockRefetch).toHaveBeenCalledTimes(1); // 【確認内容】: 再試行ボタンクリックでrefetch関数が呼び出されること 🟡
  });

  test('2-2. JWT認証失敗時の適切なエラー処理', () => {
    // 【テスト目的】: セキュリティエラーハンドリング確認
    // 【テスト内容】: 認証トークンの有効期限切れまたは改ざん検出
    // 【期待される動作】: セキュリティ要件とユーザーガイダンスの両立
    // 🟢 既存認証実装パターン（TASK-301）からの高信頼性

    // 【テストデータ準備】: JWT有効期限切れ、不正なトークンをシミュレート
    // 【初期条件設定】: 401 Unauthorizedレスポンスをモック
    // 【Context DI設定】: UserServiceで認証エラーを投げる
    mockUserService.getUserProfile.mockRejectedValue(
      new Error('認証が必要です。再度ログインしてください'),
    );

    // 【実際の処理実行】: 認証エラー状態でのコンポーネントレンダリング
    // 【処理内容】: 認証エラーハンドリングの確認
    render(
      <UserServiceProvider value={mockUserService}>
        <UserProfile />
      </UserServiceProvider>,
    );

    // 【結果検証】: セキュリティとユーザビリティの適切なバランス
    // 【期待値確認】: 不正アクセス防止、適切な状態遷移
    expect(screen.getByRole('alert')).toBeTruthy(); // 【確認内容】: 認証エラーアラートの表示確認 🟢
    expect(
      screen.getByText('認証が必要です。再度ログインしてください'),
    ).toBeTruthy(); // 【確認内容】: セキュリティを保ちつつユーザーフレンドリーなメッセージ 🟢
    expect(
      screen.getByRole('link', { name: /ログインページへ/i }),
    ).toBeTruthy(); // 【確認内容】: ログインページへの誘導リンク表示 🟢
  });

  test('2-3. ネットワーク接続不良時のエラー処理', () => {
    // 【テスト目的】: ネットワーク障害耐性の確認
    // 【テスト内容】: インターネット接続断絶、DNS解決失敗
    // 【期待される動作】: オフライン環境での適切なユーザーガイダンス
    // 🟡 一般的なネットワークエラーパターンからの妥当な推測

    // 【テストデータ準備】: ネットワーク接続の一時的または永続的な断絶をシミュレート
    // 【初期条件設定】: Network Error例外をモック
    // 【Context DI設定】: UserServiceでネットワークエラーを投げる
    mockUserService.getUserProfile.mockRejectedValue(
      new Error('インターネット接続を確認してください'),
    );

    // 【実際の処理実行】: ネットワークエラー状態でのコンポーネントレンダリング
    // 【処理内容】: ネットワークエラーハンドリングの確認
    render(
      <UserServiceProvider value={mockUserService}>
        <UserProfile />
      </UserServiceProvider>,
    );

    // 【結果検証】: モバイル環境での安定性確保
    // 【期待値確認】: グレースフル・デグラデーション対応
    expect(screen.getByRole('alert')).toBeTruthy(); // 【確認内容】: ネットワークエラーアラートの表示確認 🟡
    expect(
      screen.getByText('インターネット接続を確認してください'),
    ).toBeTruthy(); // 【確認内容】: 技術的でないユーザー向けエラーメッセージ 🟡
    expect(screen.getByTestId('offline-indicator')).toBeTruthy(); // 【確認内容】: オフライン状態の視覚的表示 🟡
  });

  // ===== 3. 境界値テストケース（最小値、最大値、null等） =====

  test('3-1. 50文字を超える長いユーザー名の適切な省略表示', () => {
    // 【テスト目的】: UI設計境界での堅牢性確認
    // 【テスト内容】: 50文字を超える長いユーザー名の適切な省略表示
    // 【期待される動作】: 長い名前でもレイアウト崩れを防ぐ
    // 🟢 EDGE-101要件明示による高信頼性

    // 【テストデータ準備】: 外国人ユーザーのフルネーム、ニックネーム設定時を想定
    // 【初期条件設定】: 51文字のユーザー名でのテスト
    const longNameUser: User = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      externalId: 'google_123456789',
      provider: 'google' as const,
      email: 'user@example.com',
      name: '12345678901234567890123456789012345678901234567890X', // 51文字
      avatarUrl: 'https://example.com/avatar.jpg',
      createdAt: '2025-08-29T10:30:00.000Z',
      updatedAt: '2025-08-29T10:30:00.000Z',
      lastLoginAt: '2025-09-01T10:30:00.000Z',
    };

    // 【Context DI設定】: UserServiceで長い名前のユーザーデータを返す
    mockUserService.getUserProfile.mockResolvedValue(longNameUser);

    // 【実際の処理実行】: 長い名前でのコンポーネントレンダリング
    // 【処理内容】: 名前省略処理とレイアウト保護の確認
    render(
      <UserServiceProvider value={mockUserService}>
        <UserProfile />
      </UserServiceProvider>,
    );

    // 【結果検証】: 極端な入力値でのレイアウト保護
    // 【期待値確認】: 正確な文字数カウント、適切な省略位置
    const nameElement = screen.getByRole('heading', { level: 2 });
    expect(nameElement.textContent).toMatch(/^.{47}\.{3}$/); // 【確認内容】: 47文字 + "..."形式での省略表示確認 🟢
    expect(nameElement.getAttribute('title')).toBe(longNameUser.name); // 【確認内容】: title属性による完全名の表示確認 🟢
  });

  test('3-2. アバター画像URL無効時のデフォルト画像表示', async () => {
    // 【テスト目的】: 画像表示の境界条件確認
    // 【テスト内容】: アバター画像URL無効時のデフォルト画像表示
    // 【期待される動作】: 画像取得失敗時の適切な代替表示
    // 🟢 既存実装確認済み + EDGE-102要件による高信頼性

    // 【テストデータ準備】: 外部画像サーバー障害、画像削除、不正URLを想定
    // 【初期条件設定】: avatarUrl: null と 無効URLの両パターン
    const userWithInvalidAvatar: User = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      externalId: 'google_123456789',
      provider: 'google' as const,
      email: 'user@example.com',
      name: '山田太郎',
      avatarUrl: 'https://invalid-url.example.com/404.jpg',
      createdAt: '2025-08-29T10:30:00.000Z',
      updatedAt: '2025-08-29T10:30:00.000Z',
      lastLoginAt: '2025-09-01T10:30:00.000Z',
    };

    // 【Context DI設定】: UserServiceで無効アバターURLのユーザーデータを返す
    mockUserService.getUserProfile.mockResolvedValue(userWithInvalidAvatar);

    // 【実際の処理実行】: 無効画像URLでのコンポーネントレンダリング
    // 【処理内容】: 画像フォールバック機能の確認
    render(
      <UserServiceProvider value={mockUserService}>
        <UserProfile />
      </UserServiceProvider>,
    );

    // 【結果検証】: 外部リソース依存での安定性確保
    // 【期待値確認】: エラー状態での確実な代替表示
    const avatarImage = screen.getByRole('img', { name: /プロフィール画像/i });

    // 【画像エラー発生シミュレーション】: onErrorイベントを手動で発火
    // 【テスト手法】: 実際の画像読み込みエラーをシミュレート
    fireEvent.error(avatarImage);

    // 画像読み込み失敗を待機
    await waitFor(() => {
      expect(avatarImage.getAttribute('src')).toContain('default-avatar.png'); // 【確認内容】: デフォルト画像への自動フォールバック確認 🟢
    });

    expect(avatarImage.getAttribute('alt')).toBe('プロフィール画像'); // 【確認内容】: 適切なalt属性の設定確認 🟢
  });

  test('3-3. 必須フィールド以外がnull/undefinedの場合の適切な表示', () => {
    // 【テスト目的】: データ境界での安全性確認
    // 【テスト内容】: 必須フィールド以外がnull/undefinedの場合の適切な表示
    // 【期待される動作】: 不完全なデータでの安全な表示
    // 🟡 新規ユーザーパターンからの妥当な推測

    // 【テストデータ準備】: JITプロビジョニング直後、データ移行時を想定
    // 【初期条件設定】: 新規ユーザー（初回ログイン）の状態
    const incompleteUser: User = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      externalId: 'google_123456789',
      provider: 'google' as const,
      email: 'user@example.com',
      name: '山田太郎',
      avatarUrl: null, // 境界値：アバター未設定
      createdAt: '2025-08-29T10:30:00.000Z',
      updatedAt: '2025-08-29T10:30:00.000Z',
      lastLoginAt: null, // 境界値：初回ログイン時
    };

    // 【Context DI設定】: UserServiceで不完全なユーザーデータを返す
    mockUserService.getUserProfile.mockResolvedValue(incompleteUser);

    // 【実際の処理実行】: 不完全データでのコンポーネントレンダリング
    // 【処理内容】: null値処理とデフォルト表示の確認
    render(
      <UserServiceProvider value={mockUserService}>
        <UserProfile />
      </UserServiceProvider>,
    );

    // 【結果検証】: 不完全なデータでのアプリケーション動作保証
    // 【期待値確認】: null値の適切な判定と代替表示
    expect(screen.getByText('山田太郎')).toBeTruthy(); // 【確認内容】: 必須フィールドの正常表示確認 🟡
    expect(screen.getByText('user@example.com')).toBeTruthy(); // 【確認内容】: メールアドレスの正常表示確認 🟡
    expect(screen.getByText(/初回ログインです/)).toBeTruthy(); // 【確認内容】: 最終ログイン日時欄に初回ログインメッセージ表示 🟡

    const avatarImage = screen.getByRole('img', { name: /プロフィール画像/i });
    expect(avatarImage.getAttribute('src')).toContain('default-avatar.png'); // 【確認内容】: デフォルトアバター画像の表示確認 🟡
  });
});
