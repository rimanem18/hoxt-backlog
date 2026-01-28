/**
 * 環境変数バリデーションと開発者向けセットアップガイド機能。
 * 必須環境変数のチェックと詳細な設定手順を提供する。
 */

/**
 * 環境変数バリデーション結果の型定義
 */
export interface ValidationResult {
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
 * 環境変数の検証とセットアップガイド生成を担う。
 * 必須環境変数のチェックと詳細な設定手順を提供する。
 */
export class EnvironmentValidator {
  private requiredVars: string[];
  private envConfigs: Map<string, EnvVarConfig> = new Map();

  /**
   * EnvironmentValidatorを初期化する
   * @param requiredVars - 必須環境変数のリスト
   */
  constructor(requiredVars: string[]) {
    this.requiredVars = requiredVars;
    this.initializeEnvConfigs();
  }

  /**
   * 各環境変数の設定情報を定義する
   */
  private initializeEnvConfigs(): void {
    // Supabase関連の環境変数設定
    this.envConfigs.set('NEXT_PUBLIC_SUPABASE_URL', {
      name: 'NEXT_PUBLIC_SUPABASE_URL',
      required: true,
      description: 'SupabaseプロジェクトのAPI URL',
      example: 'https://your-project.supabase.co',
    });

    this.envConfigs.set('NEXT_PUBLIC_SUPABASE_ANON_KEY', {
      name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      required: true,
      description: 'Supabaseの匿名認証キー（公開キー）',
      example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    });

    this.envConfigs.set('NEXT_PUBLIC_SITE_URL', {
      name: 'NEXT_PUBLIC_SITE_URL',
      required: true,
      description: 'アプリケーションのベースURL（OAuth リダイレクト用）',
      example: 'http://localhost:3000',
      defaultValue: 'http://localhost:3000',
    });

    // オプション環境変数設定
    this.envConfigs.set('NODE_ENV', {
      name: 'NODE_ENV',
      required: false,
      description: '実行環境（development/production/test）',
      example: 'development',
      defaultValue: 'development',
    });
  }

  /**
   * 必須環境変数の存在と有効性を検証する
   * @param envVars - 検証対象の環境変数オブジェクト
   * @returns バリデーション結果
   */
  validateEnvironment(
    envVars: Record<string, string | undefined | null>,
  ): ValidationResult {
    const missingVars: string[] = [];
    const emptyVars: string[] = [];
    const errors: string[] = [];

    // 各必須環境変数の存在と値をチェック
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

    // バリデーション結果の生成
    const isValid = missingVars.length === 0 && emptyVars.length === 0;
    const setupGuide = this.generateSetupGuide(missingVars, emptyVars);

    return {
      isValid,
      missingVars,
      emptyVars,
      setupGuide,
      errors,
    };
  }

  /**
   * 不足環境変数に対する詳細な設定手順を生成する
   * @param missingVars - 不足している環境変数
   * @param emptyVars - 空文字列の環境変数
   * @returns セットアップガイドの文字列
   */
  private generateSetupGuide(
    missingVars: string[],
    emptyVars: string[],
  ): string {
    const problemVars = [...missingVars, ...emptyVars];

    if (problemVars.length === 0) {
      return '環境変数の設定に問題ありません。';
    }

    let guide = '\n📋 環境変数設定ガイド\n';
    guide += '========================\n\n';

    // ファイル作成手順
    guide += '1. 環境変数ファイルを作成してください：\n';
    guide += '   プロジェクトルートに .env.local ファイルを作成\n\n';

    // 設定例
    guide += '2. 以下の内容を .env.local に追加してください：\n';
    guide += '   ```\n';

    for (const varName of problemVars) {
      const config = this.envConfigs.get(varName);
      if (config) {
        guide += `   ${varName}=${config.example || 'YOUR_VALUE_HERE'}\n`;
      }
    }

    guide += '   ```\n\n';

    // 各環境変数の説明
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

    // 設定確認方法
    guide += '4. 設定確認方法：\n';
    guide += '   • 開発サーバーを再起動してください\n';
    guide += '   • ブラウザでアプリケーションを開いてください\n';
    guide += '   • このエラーメッセージが消えれば設定完了です\n\n';

    // トラブルシューティング
    guide += '🔧 トラブルシューティング：\n';
    guide += '   • .env.local ファイルがプロジェクトルートにあることを確認\n';
    guide += '   • 環境変数名のスペルミスがないことを確認\n';
    guide += '   • 値に不要なスペースが含まれていないことを確認\n';
    guide += '   • 開発サーバーの再起動を行う\n';

    return guide;
  }

  /**
   * 構造化されたセットアップ手順情報を生成する
   * @returns 構造化されたセットアップ手順
   */
  generateSetupInstructions(): SetupInstructions {
    const fileCreation = [
      'プロジェクトルートディレクトリに移動',
      '.env.local ファイルを作成',
      '必要な環境変数を追加',
      '開発サーバーを再起動',
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
      '認証機能が正常に動作することを確認',
    ];

    return {
      fileCreation,
      configExamples,
      verificationSteps,
    };
  }

  /**
   * .env.local ファイルのテンプレート文字列を生成する
   * @returns .env.local ファイルのテンプレート内容
   */
  generateEnvTemplate(): string {
    let template = '# Next.js 認証アプリケーション環境変数設定\n';
    template += '# ファイル名: .env.local\n';
    template += `# 作成日: ${new Date().toISOString().split('T')[0]}\n\n`;

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
   * 現在の環境変数設定状況をコンソールに表示する
   */
  displayCurrentStatus(): void {
    // 本番環境では実行しない
    if (process.env.NODE_ENV !== 'development') {
      return;
    }

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
