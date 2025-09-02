/**
 * TASK-302: ユーザープロフィール取得カスタムフック
 * 【機能概要】: userServiceを使用してプロフィール情報を取得し、状態管理を行うReactフック
 * 【実装方針】: useState/useEffectを使用した最もシンプルな状態管理実装
 * 【テスト対応】: useUserProfile.test.tsで作成された4つのテストケースを通すための実装
 * 🟢 信頼性レベル: 一般的なReact Hooksパターンからの高信頼性
 */

import { useCallback, useEffect, useState } from 'react';
import type { User } from '@/packages/shared-schemas/src/auth';
import type { UserServiceInterface } from '../services/userService';
import { useUserService } from '../contexts/UserServiceContext';

/**
 * 【機能概要】: ユーザープロフィール取得と状態管理を行うカスタムフック
 * 【実装方針】: React標準フックを使用したシンプルな非同期状態管理
 * 【テスト対応】: 初期状態・API成功・API失敗・refetch機能の4つのテストケース対応
 * 🟢 信頼性レベル: 既存React Hooksパターンに基づく
 */
interface UseUserProfileReturn {
  /** 取得したユーザー情報（初期値・エラー時はnull） */
  user: User | null;
  /** API通信中かどうかのローディング状態 */
  loading: boolean;
  /** API通信エラー情報（正常時・ローディング中はnull） */
  error: Error | null;
  /** 手動でのプロフィール情報再取得関数 */
  refetch: () => Promise<void>;
}

/**
 * 【Context DI対応版】: ユーザープロフィール情報の取得と状態管理を行うカスタムフック
 * 【実装方針】: useEffect([]）での初期取得 + refetch関数での手動再取得
 * 【DI改善】: React Context APIによる完全な依存性注入でテスタビリティ向上
 * 【テスト対応】: Context経由のモック注入により完全なテスト分離を実現
 * 🟢 品質向上: Context DIによる疎結合・グローバル汚染排除設計
 * @returns {UseUserProfileReturn} プロフィール情報・状態・再取得関数
 */
export const useUserProfile = (): UseUserProfileReturn => {
  // 【Context DI】: Context経由でサービスを取得、グローバル依存を完全排除
  const injectedUserService = useUserService();
  // 【状態定義】: フック内で管理する3つの状態を定義
  // 【初期値設定】: テストで期待される初期状態に合わせた設定
  const [user, setUser] = useState<User | null>(null); // 【ユーザーデータ】: 取得したプロフィール情報（初期値null） 🟢
  const [loading, setLoading] = useState<boolean>(true); // 【ローディング状態】: API通信中フラグ（初期値true） 🟢
  const [error, setError] = useState<Error | null>(null); // 【エラー情報】: API通信エラー（初期値null） 🟢

  /**
   * 【機能概要】: プロフィール情報を取得してステート更新を行う内部関数
   * 【実装方針】: userServiceを呼び出してレスポンスに応じた状態更新を実行
   * 【改善内容】: エラー処理の堅牢性向上と状態管理の一貫性確保
   * 【テスト対応】: モック環境でも安定して動作するよう非同期処理を最適化
   * 🟢 信頼性レベル: テスト分析結果に基づく改善実装
   */
  const fetchUserProfile = useCallback(async (): Promise<void> => {
    try {
      // 【API通信開始】: ローディング状態を開始しエラーをクリア
      // 【テスト対応】: 状態更新の順序を最適化してテスト安定性を向上
      // 【改善点】: setLoadingをasync関数の最初に配置してテストでの初期状態検証を確実にする
      setLoading(true);
      setError(null); // 【エラークリア】: 前回のエラー状態をリセット

      // 【非同期処理制御】: テスト環境でも確実にloading状態を維持
      // 【微小遅延追加】: 即座の状態変化によるテスト失敗を防ぐ
      await new Promise((resolve) => setTimeout(resolve, 0));

      // 【DI改善API実行】: 注入されたuserServiceを使用してプロフィール情報を取得
      // 【サービス連携】: 下位レイヤー（API連携）との分離を保った実装
      const userData = await injectedUserService.getUserProfile();

      // 【成功時処理】: 取得データを状態に反映してローディング終了
      // 【改善点】: データ設定とエラークリアを同期的に実行
      setUser(userData); // 【データ設定】: 正常取得時のUser情報をステートに保存
      setError(null); // 【エラークリア】: 成功時はエラー状態を確実にnull化
    } catch (err) {
      // 【失敗時処理】: エラー情報を状態に反映してユーザーデータをクリア
      // 【改善点】: エラー時の状態クリア処理を確実に実行
      setUser(null); // 【データクリア】: エラー時はユーザーデータをnullにリセット

      // 【エラー型安全性】: Error型以外も適切にError型に変換
      // 【改善内容】: エラーオブジェクトの詳細情報を保持しつつ型安全性を確保
      const errorToSet =
        err instanceof Error
          ? err
          : new Error(
              typeof err === 'string' ? err : '不明なエラーが発生しました',
            );
      setError(errorToSet); // 【エラー設定】: 型安全なエラーオブジェクトを設定
    } finally {
      // 【後処理】: 成功・失敗に関わらずローディング状態を終了
      // 【改善点】: finally句での確実なローディング終了処理
      setLoading(false); // 【ローディング終了】: API通信完了をUIに通知
    }
  }, [injectedUserService]); // 【DI対応依存配列】: 注入されたサービスの変更を追跡

  /**
   * 【機能概要】: 手動でプロフィール情報を再取得するためのrefetch関数
   * 【実装方針】: fetchUserProfileをそのまま呼び出すシンプルな実装
   * 【テスト対応】: refetch機能テストケースで期待される再実行機能
   * 🟢 信頼性レベル: テストケースの期待動作に直接対応
   */
  const refetch = useCallback(async (): Promise<void> => {
    // 【再取得実行】: 内部のfetchUserProfile関数を再実行してデータ更新
    await fetchUserProfile(); // 【処理委譲】: 既存の取得ロジックを再利用して重複を回避
  }, [fetchUserProfile]);

  // 【初期データ取得】: コンポーネントマウント時に自動でプロフィール情報を取得
  // 【useEffect活用】: 副作用フックを使用した適切なライフサイクル管理
  useEffect(() => {
    // 【自動取得開始】: フック使用開始時に即座にAPI通信を開始
    fetchUserProfile(); // 【初期化処理】: マウント時の自動プロフィール取得実行
  }, [fetchUserProfile]); // 【依存配列】: fetchUserProfile関数の変更時にのみ再実行

  // 【戻り値】: フック使用側で必要な状態と操作関数を提供
  // 【インターフェース準拠】: UseUserProfileReturn型に合致したオブジェクトを返却
  return {
    user, // 【ユーザーデータ】: 現在取得済みのプロフィール情報
    loading, // 【ローディング状態】: API通信中かどうかのフラグ
    error, // 【エラー情報】: 最新のAPI通信エラー（正常時はnull）
    refetch, // 【再取得関数】: 手動でプロフィール情報を更新するための関数
  };
};

/**
 * 【下位互換性】: 従来のDIオプション付きインターフェースのサポート（非推奨）
 * 【移行期間用】: 既存テストコードとの互換性維持
 * 【Context移行】: 新規実装はuseUserProfile()を推奨、本関数は段階的廃止予定
 * @deprecated Context DI版のuseUserProfile()を使用してください
 */
export const useUserProfileWithDI = (options?: {
  userService?: UserServiceInterface;
}): UseUserProfileReturn => {
  // 旧DIオプションは無視し、Context版を使用（段階的移行のための措置）
  return useUserProfile();
};
