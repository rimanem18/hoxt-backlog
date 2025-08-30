/**
 * 【機能概要】: 環境変数バリデーションと開発者向けセットアップガイド機能を提供するサービスクラス
 * 【実装方針】: errorHandling.test.ts のテストケースを通すために必要な機能を実装
 * 【テスト対応】: 必須環境変数チェック・不足項目検出・設定ガイド生成
 * 🟡 信頼性レベル: 環境変数未設定境界値テストケースと開発体験向上の観点から妥当に推測
 */

/**
 * 環境変数バリデーション結果の型定義
 * 【型定義】: 環境変数検証の結果情報
 */
interface ValidationResult {
  /** 検証結果の成功フラグ */
  isValid: boolean;
  /** 不足している環境変数のリスト */
  missingVars: string[];
  /** 空文字列の環境変数のリスト */
  emptyVars: string[];
  /** 開発者向けセットアップガイド */
  setupGuide: string;
  /** エラー詳細情報 */
  errors: string[];
}

/**
 * 環境変数設定項目の型定義
 * 【型定義】: 個別環境変数の設定情報
 */
interface EnvVarConfig {
  /** 環境変数名 */
  name: string;
  /** 必須フラグ */
  required: boolean;
  /** 説明 */
  description: string;
  /** サンプル値 */
  example?: string;
  /** デフォルト値 */
  defaultValue?: string;
}

/**
 * セットアップ手順の型定義
 * 【型定義】: 環境変数セットアップの手順情報
 */
interface SetupInstructions {
  /** ファイル作成手順 */
  fileCreation: string[];
  /** 設定例 */
  configExamples: Record<string, string>;
  /** 確認方法 */
  verificationSteps: string[];
}

/**
 * 【EnvironmentValidatorクラス】: 環境変数検証・セットアップガイド・開発者支援機能の実装
 * 【実装内容】: 必須環境変数チェック・不足項目検出・詳細セットアップガイド生成
 * 【テスト要件対応】: errorHandling.test.ts の環境変数未設定関連テストケースに対応
 * 🟡 信頼性レベル: テストケースと開発体験向上の観点から妥当に推測した実装
 */
export class EnvironmentValidator {
  private requiredVars: string[];
  private envConfigs: Map<string, EnvVarConfig> = new Map();

  /**
   * EnvironmentValidatorのコンストラクタ
   * 【初期化】: 必須環境変数リストと設定情報の初期化
   * @param requiredVars - 必須環境変数のリスト
   */
  constructor(requiredVars: string[]) {
    this.requiredVars = requiredVars;
    this.initializeEnvConfigs();
  }

  /**
   * 【環境変数設定初期化】: 各環境変数の設定情報を定義
   * 【実装内容】: 環境変数ごとの説明・サンプル・デフォルト値の設定
   * 🟡 信頼性レベル: Supabase環境変数の標準的な設定から推測
   */
  private initializeEnvConfigs(): void {
    // 【Supabase関連環境変数】
    this.envConfigs.set('NEXT_PUBLIC_SUPABASE_URL', {
      name: 'NEXT_PUBLIC_SUPABASE_URL',
      required: true,
      description: 'SupabaseプロジェクトのAPI URL',
      example: 'https://your-project.supabase.co'
    });

    this.envConfigs.set('NEXT_PUBLIC_SUPABASE_ANON_KEY', {
      name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      required: true,
      description: 'Supabaseの匿名認証キー（公開キー）',
      example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
    });

    this.envConfigs.set('NEXT_PUBLIC_SITE_URL', {
      name: 'NEXT_PUBLIC_SITE_URL',
      required: true,
      description: 'アプリケーションのベースURL（OAuth リダイレクト用）',
      example: 'http://localhost:3000',
      defaultValue: 'http://localhost:3000'
    });

    // 【オプション環境変数】
    this.envConfigs.set('NODE_ENV', {
      name: 'NODE_ENV',
      required: false,
      description: '実行環境（development/production/test）',
      example: 'development',
      defaultValue: 'development'
    });
  }

  /**
   * 【環境変数バリデーション】: 必須環境変数の存在と有効性を確認
   * 【実装内容】: 環境変数存在確認・空文字列チェック・セットアップガイド生成
   * 【テスト要件対応】: "環境変数未設定時のエラー処理" テストケース
   * 🟡 信頼性レベル: テストケースから妥当に推測した実装
   * @param envVars - 検証対象の環境変数オブジェクト
   * @returns {ValidationResult} - バリデーション結果
   */
  validateEnvironment(envVars: Record<string, string | undefined | null>): ValidationResult {
    const missingVars: string[] = [];
    const emptyVars: string[] = [];
    const errors: string[] = [];

    // 【必須環境変数チェック】: 各必須変数の存在確認
    for (const varName of this.requiredVars) {
      const value = envVars[varName];
      
      if (value === undefined || value === null) {
        missingVars.push(varName);
        errors.push(`環境変数 ${varName} が設定されていません`);
      } else if (value === '') {
        emptyVars.push(varName);
        errors.push(`環境変数 ${varName} が空文字列です`);
      }
    }

    // 【バリデーション結果生成】
    const isValid = missingVars.length === 0 && emptyVars.length === 0;
    const setupGuide = this.generateSetupGuide(missingVars, emptyVars);

    return {
      isValid,
      missingVars,
      emptyVars,
      setupGuide,
      errors
    };
  }

  /**
   * 【セットアップガイド生成】: 不足環境変数に対する詳細な設定手順を生成
   * 【実装内容】: .env.local ファイル作成手順・設定例・確認方法の提供
   * 【開発者体験】: コピー&ペーストで使える具体的な設定例を提供
   * 🟡 信頼性レベル: Next.js環境変数設定の標準的な手順から推測
   * @param missingVars - 不足している環境変数
   * @param emptyVars - 空文字列の環境変数
   * @returns {string} - セットアップガイドの文字列
   */
  private generateSetupGuide(missingVars: string[], emptyVars: string[]): string {
    const problemVars = [...missingVars, ...emptyVars];
    
    if (problemVars.length === 0) {
      return '環境変数の設定に問題ありません。';
    }

    let guide = '\n📋 環境変数設定ガイド\n';
    guide += '========================\n\n';

    // 【手順1: ファイル作成】
    guide += '1. 環境変数ファイルを作成してください：\n';
    guide += '   プロジェクトルートに .env.local ファイルを作成\n\n';

    // 【手順2: 設定例】
    guide += '2. 以下の内容を .env.local に追加してください：\n';
    guide += '   ```\n';
    
    for (const varName of problemVars) {
      const config = this.envConfigs.get(varName);
      if (config) {
        guide += `   ${varName}=${config.example || 'YOUR_VALUE_HERE'}\n`;
      }
    }
    
    guide += '   ```\n\n';

    // 【手順3: 各環境変数の説明】
    guide += '3. 各環境変数の取得方法：\n';
    for (const varName of problemVars) {
      const config = this.envConfigs.get(varName);
      if (config) {
        guide += `   • ${varName}:\n     ${config.description}\n`;
        if (varName.includes('SUPABASE')) {
          guide += '     取得場所: Supabase Dashboard > Settings > API\n';
        }
        guide += '\n';
      }
    }

    // 【手順4: 確認方法】
    guide += '4. 設定確認方法：\n';
    guide += '   • 開発サーバーを再起動してください\n';
    guide += '   • ブラウザでアプリケーションを開いてください\n';
    guide += '   • このエラーメッセージが消えれば設定完了です\n\n';

    // 【トラブルシューティング】
    guide += '🔧 トラブルシューティング：\n';
    guide += '   • .env.local ファイルがプロジェクトルートにあることを確認\n';
    guide += '   • 環境変数名のスペルミスがないことを確認\n';
    guide += '   • 値に不要なスペースが含まれていないことを確認\n';
    guide += '   • 開発サーバーの再起動を行う\n';

    return guide;
  }

  /**
   * 【セットアップ手順生成】: 構造化されたセットアップ手順情報を生成
   * 【実装内容】: ファイル作成・設定例・確認手順を構造化データで提供
   * 【テスト要件対応】: generateSetupInstructions機能の存在確認テスト
   * 🟡 信頼性レベル: テストケースから機能存在を確認
   * @returns {SetupInstructions} - 構造化されたセットアップ手順
   */
  generateSetupInstructions(): SetupInstructions {
    const fileCreation = [
      'プロジェクトルートディレクトリに移動',
      '.env.local ファイルを作成',
      '必要な環境変数を追加',
      '開発サーバーを再起動'
    ];

    const configExamples: Record<string, string> = {};
    for (const [varName, config] of this.envConfigs.entries()) {
      if (config.required) {
        configExamples[varName] = config.example || 'YOUR_VALUE_HERE';
      }
    }

    const verificationSteps = [
      'ブラウザでアプリケーションを開く',
      'コンソールエラーがないことを確認',
      '認証機能が正常に動作することを確認'
    ];

    return {
      fileCreation,
      configExamples,
      verificationSteps
    };
  }

  /**
   * 【環境変数テンプレート生成】: .env.local ファイルのテンプレート文字列を生成
   * 【実装内容】: コメント付きの環境変数テンプレートファイル内容生成
   * 【開発者支援】: コピー&ペーストで使える完全なテンプレート提供
   * 🟡 信頼性レベル: 環境変数管理の一般的なベストプラクティス
   * @returns {string} - .env.local ファイルのテンプレート内容
   */
  generateEnvTemplate(): string {
    let template = '# Next.js 認証アプリケーション環境変数設定\n';
    template += '# ファイル名: .env.local\n';
    template += '# 作成日: ' + new Date().toISOString().split('T')[0] + '\n\n';

    template += '# ====================================\n';
    template += '# Supabase設定\n';
    template += '# ====================================\n';
    template += '# Supabase Dashboard > Settings > API から取得\n\n';

    for (const [varName, config] of this.envConfigs.entries()) {
      if (config.required) {
        template += `# ${config.description}\n`;
        template += `${varName}=${config.example || 'YOUR_VALUE_HERE'}\n\n`;
      }
    }

    template += '# ====================================\n';
    template += '# オプション設定\n';
    template += '# ====================================\n\n';

    for (const [varName, config] of this.envConfigs.entries()) {
      if (!config.required) {
        template += `# ${config.description}\n`;
        template += `# ${varName}=${config.example || config.defaultValue || 'OPTIONAL_VALUE'}\n\n`;
      }
    }

    return template;
  }

  /**
   * 【環境変数設定状況表示】: 現在の環境変数設定状況をコンソールに表示
   * 【実装内容】: 設定済み・未設定の環境変数を分かりやすく表示
   * 【デバッグ支援】: 開発者が現在の設定状況を把握するための表示
   * 🟡 信頼性レベル: デバッグ支援の一般的なパターン
   */
  displayCurrentStatus(): void {
    console.log('\n🔍 環境変数設定状況');
    console.log('==================');

    for (const varName of this.requiredVars) {
      const value = process.env[varName];
      const config = this.envConfigs.get(varName);
      
      if (value) {
        console.log(`✅ ${varName}: 設定済み`);
      } else {
        console.log(`❌ ${varName}: 未設定`);
        if (config) {
          console.log(`   説明: ${config.description}`);
        }
      }
    }
    
    console.log('');
  }
}