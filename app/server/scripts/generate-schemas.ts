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
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { join } from 'node:path';

// BASE_SCHEMAが未設定の場合はデフォルト値を使用（開発環境用）
process.env.BASE_SCHEMA = process.env.BASE_SCHEMA || 'test_schema';

// Drizzleスキーマのimport（相対パスを使用）
import {
  authProviderType,
  users,
} from '../src/infrastructure/database/schema';

/**
 * Enum設定の型定義
 */
interface EnumConfig {
  name: string; // Drizzleスキーマでのenum変数名（例: 'authProviderType'）
  exportName: string; // エクスポート時のZodスキーマ名（例: 'authProviderSchema'）
  values: readonly string[]; // enum値の配列
}

/**
 * テーブル設定の型定義
 */
interface TableConfig {
  tableName: string; // テーブル名（例: 'users'）
  tableObject: unknown; // Drizzleテーブルオブジェクト
  outputFile: string; // 出力ファイル名（例: 'users.ts'）
  enums?: EnumConfig[]; // 関連するenum設定（オプション）
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
  // 将来的なテーブル追加例（コメントアウト）
  // {
  //   tableName: 'posts',
  //   tableObject: posts,
  //   outputFile: 'posts.ts',
  //   enums: [],
  // },
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
  const timestamp = new Date().toISOString();
  return `/**
 * このファイルは自動生成されました
 *
 * 生成日時: ${timestamp}
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
  const { exportName, values } = enumConfig;
  const valuesStr = values.map((v) => `  '${v}',`).join('\n');

  return `/**
 * ${exportName}（enumから自動生成）
 */
export const ${exportName} = z.enum([
${valuesStr}
]);

export type ${capitalize(exportName.replace('Schema', ''))} = z.infer<typeof ${exportName}>;`;
}

/**
 * テーブル設定から型安全なZodスキーマファイルを生成
 *
 * @param config テーブル設定
 * @returns 生成されたスキーマファイルの内容
 */
function generateSchemaFile(config: TableConfig): string {
  const { tableName, enums = [] } = config;

  // キャピタライズされたテーブル名（User, Post等）
  // 注意: 単数形を維持（users → User）
  const singularName = tableName.endsWith('s') ? tableName.slice(0, -1) : tableName;
  const capitalizedName = capitalize(singularName);

  // enum部分のコード生成
  const enumsCode = enums.map((enumConfig) => generateEnumCode(enumConfig)).join('\n\n');

  // importするenum名のリスト
  const enumImports = enums.length > 0 ? `, ${enums.map((e) => e.name).join(', ')}` : '';

  return `${generateFileHeader()}

import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { ${tableName}${enumImports} } from '@/infrastructure/database/schema';

/**
 * ${capitalizedName}テーブルのSelectスキーマ（DB読み取り型）
 *
 * Drizzle ORMの${tableName}テーブルから自動生成された型安全なスキーマ。
 * データベースから取得したデータの検証に使用する。
 */
// @ts-expect-error - Drizzle Zod型定義の互換性問題（実行時は正常に動作）
export const select${capitalizedName}Schema = createSelectSchema(${tableName});

/**
 * ${capitalizedName}テーブルのInsertスキーマ（DB書き込み型）
 *
 * Drizzle ORMの${tableName}テーブルから自動生成された型安全なスキーマ。
 * データベースへの挿入データの検証に使用する。
 */
// @ts-expect-error - Drizzle Zod型定義の互換性問題（実行時は正常に動作）
export const insert${capitalizedName}Schema = createInsertSchema(${tableName});

/**
 * 型定義のエクスポート
 */
export type Select${capitalizedName} = z.infer<typeof select${capitalizedName}Schema>;
export type Insert${capitalizedName} = z.infer<typeof insert${capitalizedName}Schema>;
${enumsCode ? '\n' + enumsCode : ''}
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
