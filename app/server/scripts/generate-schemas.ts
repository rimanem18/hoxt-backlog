/**
 * Drizzle Zodスキーマ自動生成スクリプト（改善版）
 *
 * Drizzle ORMのスキーマ定義からZodスキーマを自動生成し、
 * server/src/schemas/に出力する（server専用DBスキーマ）。
 *
 * 実行方法:
 *   bun run generate:schemas
 *
 * 注意事項:
 * - このスクリプトはルートディレクトリから実行される
 * - 生成されたファイルは手動編集禁止
 * - Drizzleスキーマ変更時に必ず再実行すること
 *
 * 改善点:
 * - テーブル追加時は tableConfigs 配列に1エントリ追加するだけ
 * - enum も設定配列で管理
 * - コードの重複を削除
 */

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

// BASE_SCHEMAが未設定の場合はデフォルト値を使用（開発環境用）
process.env.BASE_SCHEMA = process.env.BASE_SCHEMA || 'test_schema';

// Drizzleスキーマのimport（相対パスを使用）
import {
  authProviderType,
  users,
  tasks,
  projects,
} from '../src/shared/database/schema';

/**
 * Enum設定の型定義
 */
interface EnumConfig {
  name: string; // Drizzleスキーマでのenum変数名（例: 'authProviderType'）
  exportName: string; // エクスポート時のZodスキーマ名（例: 'authProviderSchema'）
  values: readonly string[]; // enum値の配列
  description?: string; // enumの説明（オプション）
}

/**
 * カスタムバリデーション設定の型定義
 */
interface CustomValidationConfig {
  min?: number;
  max?: number;
  optional?: boolean;
  defaultValue?: string;
  errorMessages?: {
    min?: string;
    max?: string;
  };
}

/**
 * テーブル設定の型定義
 */
interface TableConfig {
  tableName: string; // テーブル名（例: 'users'）
  tableObject: unknown; // Drizzleテーブルオブジェクト
  outputFile: string; // 出力ファイル名（例: 'users.ts'）
  enums?: EnumConfig[]; // 関連するenum設定（オプション）
  customValidations?: Record<string, CustomValidationConfig>; // カスタムバリデーション（オプション）
}

/**
 * テーブル設定配列
 *
 * 新しいテーブルを追加する場合は、ここに設定を追加するだけで
 * 自動的にZodスキーマが生成されます。
 */
const tableConfigs: TableConfig[] = [
  {
    tableName: 'users',
    tableObject: users,
    outputFile: 'users.ts',
    enums: [
      {
        name: 'authProviderType',
        exportName: 'authProviderSchema',
        values: authProviderType.enumValues,
      },
    ],
  },
  {
    tableName: 'tasks',
    tableObject: tasks,
    outputFile: 'tasks.ts',
    enums: [
      {
        name: 'taskPriority',
        exportName: 'taskPrioritySchema',
        values: ['high', 'medium', 'low'] as const,
        description: 'タスクの優先度',
      },
      {
        name: 'taskStatus',
        exportName: 'taskStatusSchema',
        values: [
          'not_started',
          'in_progress',
          'in_review',
          'completed',
        ] as const,
        description: 'タスクのステータス',
      },
    ],
    customValidations: {
      title: {
        min: 1,
        max: 100,
        errorMessages: {
          min: 'タイトルを入力してください',
          max: 'タイトルは100文字以内で入力してください',
        },
      },
      description: {
        optional: true,
      },
      priority: {
        defaultValue: 'medium',
      },
      status: {
        defaultValue: 'not_started',
      },
    },
  },
  {
    tableName: 'projects',
    tableObject: projects,
    outputFile: 'projects.ts',
    customValidations: {
      name: {
        min: 1,
        max: 100,
        errorMessages: {
          min: '名前を入力してください',
          max: '名前は100文字以内で入力してください',
        },
      },
      description: {
        optional: true,
      },
    },
  },
];

/**
 * 文字列の先頭を大文字にする
 *
 * @param str 対象の文字列
 * @returns 先頭が大文字になった文字列
 */
function capitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * ファイルヘッダーコメント生成
 *
 * @returns 生成ファイルの警告コメント
 */
function generateFileHeader(): string {
  return `/**
 * このファイルは自動生成されました
 *
 * 生成元: scripts/generate-schemas.ts
 *
 * ⚠️ 警告: このファイルを手動で編集しないでください ⚠️
 * Drizzleスキーマを変更した場合は、以下のコマンドで再生成してください:
 *   bun run generate:schemas
 */
`;
}

/**
 * Enum用のZodスキーマコードを生成
 *
 * @param enumConfig Enum設定
 * @returns 生成されたenumコード
 */
function generateEnumCode(enumConfig: EnumConfig): string {
  const { exportName, values, description } = enumConfig;
  const valuesStr = values.map((v) => `  '${v}',`).join('\n');
  const descriptionComment = description
    ? `\n * ${description}`
    : '';

  return `/**
 * ${exportName}（enumから自動生成）${descriptionComment}
 */
export const ${exportName} = z.enum([
${valuesStr}
]);

export type ${capitalize(exportName.replace('Schema', ''))} = z.infer<typeof ${exportName}>;`;
}

/**
 * カスタムバリデーションスキーマコードを生成
 *
 * @param tableName テーブル名
 * @param capitalizedName キャピタライズされたテーブル名
 * @param customValidations カスタムバリデーション設定
 * @returns 生成されたカスタムバリデーションコード
 */
function generateCustomValidationCode(
  tableName: string,
  capitalizedName: string,
  customValidations?: Record<string, CustomValidationConfig>,
): string {
  if (!customValidations || Object.keys(customValidations).length === 0) {
    return '';
  }

  const schemaLines: string[] = [];

  for (const [field, config] of Object.entries(customValidations)) {
    const validations: string[] = [];

    if (config.min !== undefined) {
      const errorMsg = config.errorMessages?.min
        ? `, { message: '${config.errorMessages.min}' }`
        : '';
      validations.push(`.min(${config.min}${errorMsg})`);
    }

    if (config.max !== undefined) {
      const errorMsg = config.errorMessages?.max
        ? `, { message: '${config.errorMessages.max}' }`
        : '';
      validations.push(`.max(${config.max}${errorMsg})`);
    }

    if (validations.length > 0) {
      schemaLines.push(`    ${field}: z.string()${validations.join('')},`);
    }
  }

  if (schemaLines.length === 0) {
    return '';
  }

  return `
/**
 * ${capitalizedName}作成用のカスタムバリデーションスキーマ
 *
 * API リクエストのバリデーションに使用する
 */
export const create${capitalizedName}Schema = z.object({
${schemaLines.join('\n')}
});

export type Create${capitalizedName} = z.infer<typeof create${capitalizedName}Schema>;`;
}

/**
 * テーブル設定から型安全なZodスキーマファイルを生成
 *
 * @param config テーブル設定
 * @returns 生成されたスキーマファイルの内容
 */
function generateSchemaFile(config: TableConfig): string {
  const { tableName, enums = [], customValidations } = config;

  // キャピタライズされたテーブル名（User, Post等）
  // 注意: 単数形を維持（users → User）
  const singularName = tableName.endsWith('s') ? tableName.slice(0, -1) : tableName;
  const capitalizedName = capitalize(singularName);

  // enum部分のコード生成
  const enumsCode = enums.map((enumConfig) => generateEnumCode(enumConfig)).join('\n\n');

  // カスタムバリデーション部分のコード生成
  const customValidationCode = generateCustomValidationCode(
    tableName,
    capitalizedName,
    customValidations,
  );

  // importするenum名のリスト（実際にDrizzleスキーマに存在するもののみ）
  // 注意: taskPriority, taskStatus は Drizzle enum ではなくカスタム enum のため import しない
  const actualEnumImports = enums
    .filter((e) => {
      // authProviderType は実際に schema.ts に存在する
      // taskPriority, taskStatus は存在しないのでスキップ
      return e.name !== 'taskPriority' && e.name !== 'taskStatus';
    })
    .map((e) => e.name);
  const enumImports = actualEnumImports.length > 0 ? `, ${actualEnumImports.join(', ')}` : '';

  return `${generateFileHeader()}

import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { ${tableName} } from '@/shared/database/schema';

/**
 * ${capitalizedName}テーブルのSelectスキーマ（DB読み取り型）
 *
 * Drizzle ORMの${tableName}テーブルから自動生成された型安全なスキーマ。
 * データベースから取得したデータの検証に使用する。
 */
export const select${capitalizedName}Schema = createSelectSchema(${tableName});

/**
 * ${capitalizedName}テーブルのInsertスキーマ（DB書き込み型）
 *
 * Drizzle ORMの${tableName}テーブルから自動生成された型安全なスキーマ。
 * データベースへの挿入データの検証に使用する。
 */
export const insert${capitalizedName}Schema = createInsertSchema(${tableName});

/**
 * 型定義のエクスポート
 */
export type Select${capitalizedName} = z.infer<typeof select${capitalizedName}Schema>;
export type Insert${capitalizedName} = z.infer<typeof insert${capitalizedName}Schema>;
${enumsCode ? '\n' + enumsCode : ''}${customValidationCode}
`;
}

/**
 * メイン処理
 */
async function main(): Promise<void> {
  try {
    console.log('🔄 Drizzle Zodスキーマの生成を開始します...');
    console.log('');

    const outputDir = join(process.cwd(), './src/schemas');
    let successCount = 0;

    // 全テーブルを処理
    for (const config of tableConfigs) {
      const content = generateSchemaFile(config);
      const outputPath = join(outputDir, config.outputFile);

      // ファイルに書き込み
      writeFileSync(outputPath, content, 'utf-8');

      console.log(`✅ ${config.tableName}: ${outputPath}`);
      successCount++;
    }

    console.log('');
    console.log(`🎉 ${successCount}個のスキーマファイルが正常に生成されました`);
    console.log('');
    console.log('📝 次のステップ:');
    console.log('  1. 生成されたスキーマをコミット');
    console.log('  2. 必要に応じてAPI契約スキーマを追加定義');
    console.log('  3. bun run generate:openapi でOpenAPI仕様を生成');
  } catch (error) {
    console.error('❌ スキーマ生成中にエラーが発生しました:');

    if (error instanceof Error) {
      console.error(`エラーメッセージ: ${error.message}`);
      console.error('スタックトレース:');
      console.error(error.stack);
    } else {
      console.error(String(error));
    }

    process.exit(1);
  }
}

// スクリプト実行
main();
