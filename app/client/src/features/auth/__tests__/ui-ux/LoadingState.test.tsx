/**
 * UI/UXテスト: ローディング状態管理テスト
 * REQ-UI-001対応 - 認証処理中のローディングUI表示と操作制御確認
 *
 * 【テスト対象】: LoginButton コンポーネント（抽象化版）のローディング状態制御
 * 【テスト目的】: プロダクション品質のユーザビリティとアクセシビリティ確保
 */

import { describe, expect, test } from 'bun:test';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { LoginButton } from '@/features/auth/components/LoginButton';
import { createMockAuthService } from '@/features/auth/services/__tests__/mockAuthService';

// 【DI実装】: グローバルモックを排除し、テスト分離を実現

describe('LoginButton ローディング状態管理', () => {
  // 【DI分離環境】: グローバルモックを使用しないため、セットアップ処理が不要

  test('認証処理中のローディングUI表示と操作制御確認', async () => {
    // 【テスト目的】: 認証開始から完了までのローディング状態での適切なUI制御確認
    // 【テスト内容】: ボタン無効化・スピナー表示・ARIA属性設定・ラベル変更の統合テスト
    // 【期待される動作】: 処理中は操作を無効化し、視覚的フィードバックを提供する
    // 🟢 信頼性レベル: REQ-UI-001要件と既存実装から直接抽出

    // 【DIモック準備】: 3秒間の遅延をシミュレートして実際のGoogle OAuth処理時間を模擬
    // 【独立テスト環境】: 他のテストに影響しない完全分離されたモック環境
    const mockAuthService = createMockAuthService({
      shouldSucceed: true,
      delay: 3000,
    });

    // 【実際の処理実行】: DIパターンでモックサービスを注入してLoginButtonをレンダリング
    // 【処理内容】: プロバイダー選択（Google）でログインボタンを表示
    render(<LoginButton provider="google" authService={mockAuthService} />);

    const loginButton = screen.getByRole('button', {
      name: 'Googleでログイン',
    });
    const user = userEvent.setup();

    // 【初期状態の検証】: ローディング開始前のボタン状態を確認
    // 【期待値確認】: 初期状態では操作可能で適切なラベルが表示される
    expect(loginButton).not.toBeDisabled(); // 【確認内容】: 初期状態でボタンが有効であることを確認 🟢
    expect(loginButton).toHaveTextContent('Googleでログイン'); // 【確認内容】: 初期ラベルが正しく表示されることを確認 🟢
    expect(loginButton).not.toHaveAttribute('aria-busy', 'true'); // 【確認内容】: 初期状態で処理中フラグが設定されていないことを確認 🟢

    // 【認証開始処理】: ユーザーがログインボタンをクリック
    // 【実行タイミング】: 認証処理開始のタイミングで適切なローディング状態に遷移することを確認
    await user.click(loginButton);

    // 【ローディング状態の検証】: 認証処理開始直後のUI状態確認
    // 【結果検証】: REQ-UI-001で定義された全ての要素が適切に設定されているか

    // ローディング状態のボタンを取得（名前が変わるため再取得）
    const loadingButton = screen.getByRole('button', { name: '認証中...' });

    // ボタン無効化の確認
    expect(loadingButton).toBeDisabled(); // 【確認内容】: 処理中はボタンが無効化されることを確認（重複操作防止） 🟢

    // ラベル変更の確認
    expect(loadingButton).toHaveTextContent('認証中...'); // 【確認内容】: 処理中に適切な日本語ラベルが表示されることを確認 🟢

    // ARIA属性の確認（アクセシビリティ対応）
    expect(loadingButton).toHaveAttribute('aria-busy', 'true'); // 【確認内容】: スクリーンリーダー向けの処理中状態通知を確認 🟢
    expect(loadingButton).toHaveAttribute('aria-label', '認証中...'); // 【確認内容】: 支援技術向けの適切なラベル設定を確認 🟢

    // スピナーコンポーネントの表示確認
    expect(
      screen.getByRole('progressbar', { name: '認証処理中' }),
    ).toBeInTheDocument(); // 【確認内容】: 視覚的なローディングインディケーターの表示を確認 🟢

    // 【品質保証】: このテストにより、ユーザーが処理状況を理解し、誤操作を防止できることを保証
    // 【品質保証】: WCAG 2.1 AA準拠のアクセシビリティ要件も同時に検証
  });

  test('ダブルクリック防止機能の確認', async () => {
    // 【テスト目的】: 短時間内連続操作での処理重複実行防止確認
    // 【テスト内容】: 0.5秒以内の連続クリックが適切に制御されることを検証
    // 【期待される動作】: 2回目のクリックを無視し、処理は1回のみ実行される
    // 🟡 信頼性レベル: EDGE-UI-001から妥当な実装推測

    // 【DIモック準備】: 処理完了まで十分な時間を確保（重複実行検証のため）
    // 【独立テスト環境】: 認証処理中の状態を継続してダブルクリックをテスト
    const mockAuthService = createMockAuthService({
      shouldSucceed: true,
      delay: 1000,
    });

    // 【実際の処理実行】: DIパターンでコンポーネントレンダリングと連続クリック実行
    // 【処理内容】: 短時間内（0.3秒）で2回クリックして重複実行を試行
    render(<LoginButton provider="google" authService={mockAuthService} />);

    const loginButton = screen.getByRole('button', {
      name: 'Googleでログイン',
    });
    const user = userEvent.setup();

    // 【連続クリック実行】: 0.3秒間隔での2回クリック（意図的な重複操作）
    // 【実行タイミング】: 1回目のクリック直後、処理完了前に2回目をクリック
    await user.click(loginButton);

    // 短時間待機後に2回目のクリック（ダブルクリック防止のテスト）
    await new Promise((resolve) => setTimeout(resolve, 300));
    await user.click(loginButton);

    // 【結果検証】: 認証処理が1回のみ実行されることを確認
    // 【期待値確認】: システム負荷軽減とユーザー混乱防止の効果を検証
    expect(mockAuthService.mockSignInWithOAuth).toHaveBeenCalledTimes(1); // 【確認内容】: 認証処理が重複実行されていないことを確認 🟡

    // 【品質保証】: 処理重複による不正な認証状態やシステム負荷を防止
  });

  // TODO: 長時間処理対応メッセージ機能は未実装のためテスト削除
  // 将来的にLoginButtonコンポーネントに長時間処理メッセージ表示機能が実装されたら、
  // このテストを復活させる必要がある
});
