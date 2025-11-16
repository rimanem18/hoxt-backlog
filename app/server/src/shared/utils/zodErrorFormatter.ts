import type { ZodIssue } from 'zod';

/**
 * Zodバリデーションエラーを開発者にわかりやすい日本語形式に変換
 *
 * @param issues - Zodエラーの詳細情報配列
 * @returns フィールド名をキーとした日本語エラーメッセージのマップ
 *
 * @example
 * ```typescript
 * const issues: ZodIssue[] = [{
 *   code: 'invalid_type',
 *   expected: 'string',
 *   received: 'number',
 *   path: ['userId'],
 *   message: 'Expected string, received number'
 * }];
 *
 * const result = formatZodError(issues);
 * // => { userId: 'userIdは文字列型である必要がありますが、数値型が入力されました' }
 * ```
 */
export function formatZodError(issues: ZodIssue[]): Record<string, string> {
  return issues.reduce(
    (acc, issue) => {
      const field = issue.path.length > 0 ? issue.path.join('.') : '_root';
      acc[field] = createErrorMessage(issue, field);
      return acc;
    },
    {} as Record<string, string>,
  );
}

/**
 * ZodIssueから日本語エラーメッセージを生成
 *
 * @param issue - Zodエラーの詳細情報
 * @param field - フィールド名（パス結合済み）
 * @returns 日本語エラーメッセージ
 */
function createErrorMessage(issue: ZodIssue, field: string): string {
  const issueCode = issue.code as string;

  switch (issueCode) {
    case 'invalid_type':
      return createInvalidTypeMessage(issue, field);
    case 'invalid_string':
      return createInvalidStringMessage(issue, field);
    case 'too_small':
      return createTooSmallMessage(issue, field);
    case 'too_big':
      return createTooBigMessage(issue, field);
    case 'invalid_enum_value':
      return createInvalidEnumMessage(issue, field);
    case 'unrecognized_keys':
      return createUnrecognizedKeysMessage(issue, field);
    case 'invalid_union':
      return createInvalidUnionMessage(issue, field);
    case 'invalid_date':
      return `${field}は有効な日付形式である必要があります`;
    case 'custom':
      return issue.message || `${field}のバリデーションに失敗しました`;
    default:
      return issue.message || `${field}のバリデーションに失敗しました`;
  }
}

/**
 * invalid_type エラーのメッセージ生成
 */
function createInvalidTypeMessage(issue: ZodIssue, field: string): string {
  // ZodIssueは型安全性の観点から、プロパティアクセス時に型拡張が必要
  const typedIssue = issue as {
    expected?: string;
    received?: string;
  };

  if (!typedIssue.expected || !typedIssue.received) {
    return `${field}の型が正しくありません`;
  }

  const expectedType = translateType(typedIssue.expected);
  const receivedType = translateType(typedIssue.received);
  return `${field}は${expectedType}型である必要がありますが、${receivedType}型が入力されました`;
}

/**
 * invalid_string エラーのメッセージ生成
 */
function createInvalidStringMessage(issue: ZodIssue, field: string): string {
  // ZodIssueのvalidationプロパティへの型安全なアクセス
  const typedIssue = issue as {
    validation?:
      | string
      | { includes: string }
      | { startsWith: string }
      | { endsWith: string };
  };

  const validation = typedIssue.validation;

  if (!validation) {
    return `${field}の形式が正しくありません`;
  }

  if (typeof validation === 'object' && 'includes' in validation) {
    return `${field}は "${validation.includes}" を含む必要があります`;
  }

  if (typeof validation === 'object' && 'startsWith' in validation) {
    return `${field}は "${validation.startsWith}" で始まる必要があります`;
  }

  if (typeof validation === 'object' && 'endsWith' in validation) {
    return `${field}は "${validation.endsWith}" で終わる必要があります`;
  }

  switch (validation) {
    case 'email':
      return `${field}は有効なメールアドレス形式である必要があります`;
    case 'uuid':
      return `${field}は有効なUUID v4形式である必要があります`;
    case 'url':
      return `${field}は有効なURL形式である必要があります`;
    case 'datetime':
      return `${field}は有効なISO 8601日時形式である必要があります`;
    case 'ip':
      return `${field}は有効なIPアドレス形式である必要があります`;
    case 'cuid':
      return `${field}は有効なCUID形式である必要があります`;
    case 'cuid2':
      return `${field}は有効なCUID2形式である必要があります`;
    case 'ulid':
      return `${field}は有効なULID形式である必要があります`;
    case 'regex':
      return `${field}は指定された正規表現パターンに一致する必要があります`;
    default:
      return `${field}の形式が正しくありません`;
  }
}

/**
 * too_small エラーのメッセージ生成
 *
 * カスタムメッセージが指定されている場合はそれを優先
 */
function createTooSmallMessage(issue: ZodIssue, field: string): string {
  // ZodIssueのtoo_small固有プロパティへの型安全なアクセス
  const typedIssue = issue as {
    minimum?: number;
    type?: 'string' | 'number' | 'bigint' | 'array' | 'date';
    inclusive?: boolean;
  };

  const { minimum, type, inclusive } = typedIssue;

  // Zodのデフォルト英語メッセージかどうかを判定
  const isDefaultMessage =
    issue.message.startsWith('String must contain at least') ||
    issue.message.startsWith('Array must contain at least') ||
    issue.message.startsWith('Number must be greater than') ||
    issue.message.startsWith('BigInt must be greater than') ||
    issue.message.startsWith('Date must be greater than') ||
    issue.message.startsWith('Expected');

  // カスタムメッセージが指定されている場合は優先
  if (!isDefaultMessage) {
    return issue.message;
  }

  if (minimum === undefined || type === undefined || inclusive === undefined) {
    return `${field}は最小値を満たしていません`;
  }

  const comparator = inclusive ? '以上' : 'より大きい値';

  switch (type) {
    case 'string':
      return `${field}は${minimum}文字${comparator}である必要があります`;
    case 'number':
    case 'bigint':
      return `${field}は${minimum}${comparator}である必要があります`;
    case 'array':
      return `${field}は${minimum}個${comparator}の要素が必要です`;
    case 'date':
      return `${field}は${new Date(minimum).toISOString()}${comparator}である必要があります`;
    default:
      return `${field}は最小値${minimum}${comparator}である必要があります`;
  }
}

/**
 * too_big エラーのメッセージ生成
 *
 * カスタムメッセージが指定されている場合はそれを優先
 */
function createTooBigMessage(issue: ZodIssue, field: string): string {
  // ZodIssueのtoo_big固有プロパティへの型安全なアクセス
  const typedIssue = issue as {
    maximum?: number;
    type?: 'string' | 'number' | 'bigint' | 'array' | 'date';
    inclusive?: boolean;
  };

  const { maximum, type, inclusive } = typedIssue;

  // Zodのデフォルト英語メッセージかどうかを判定
  const isDefaultMessage =
    issue.message.startsWith('String must contain at most') ||
    issue.message.startsWith('Array must contain at most') ||
    issue.message.startsWith('Number must be less than') ||
    issue.message.startsWith('BigInt must be less than') ||
    issue.message.startsWith('Date must be') ||
    issue.message.startsWith('Too big') ||
    issue.message.includes('expected number to be');

  // カスタムメッセージが指定されている場合は優先
  if (!isDefaultMessage) {
    return issue.message;
  }

  if (maximum === undefined || type === undefined || inclusive === undefined) {
    return `${field}は最大値を超えています`;
  }

  const comparator = inclusive ? '以下' : '未満';

  switch (type) {
    case 'string':
      return `${field}は${maximum}文字${comparator}である必要があります`;
    case 'number':
    case 'bigint':
      return `${field}は${maximum}${comparator}である必要があります`;
    case 'array':
      return `${field}は${maximum}個${comparator}の要素である必要があります`;
    case 'date':
      return `${field}は${new Date(maximum).toISOString()}${comparator}である必要があります`;
    default:
      return `${field}は最大値${maximum}${comparator}である必要があります`;
  }
}

/**
 * invalid_enum_value エラーのメッセージ生成
 */
function createInvalidEnumMessage(issue: ZodIssue, field: string): string {
  // ZodIssueのinvalid_enum_value固有プロパティへの型安全なアクセス
  const typedIssue = issue as {
    options?: unknown[];
  };

  if (!typedIssue.options || !Array.isArray(typedIssue.options)) {
    return `${field}は指定された値のいずれかである必要があります`;
  }

  const optionsStr = typedIssue.options
    .map((opt: unknown) => `"${opt}"`)
    .join(', ');
  return `${field}は${optionsStr}のいずれかである必要があります`;
}

/**
 * unrecognized_keys エラーのメッセージ生成
 */
function createUnrecognizedKeysMessage(issue: ZodIssue, field: string): string {
  // ZodIssueのunrecognized_keys固有プロパティへの型安全なアクセス
  const typedIssue = issue as {
    keys?: string[];
  };

  if (!typedIssue.keys || !Array.isArray(typedIssue.keys)) {
    return `${field}に不明なキーが含まれています`;
  }

  const keysStr = typedIssue.keys.map((key) => `"${key}"`).join(', ');
  return `${field}に不明なキー ${keysStr} が含まれています`;
}

/**
 * invalid_union エラーのメッセージ生成
 */
function createInvalidUnionMessage(_issue: ZodIssue, field: string): string {
  return `${field}はいずれの型にも一致しませんでした`;
}

/**
 * Zod型名を日本語に翻訳
 */
function translateType(type: string): string {
  const typeMap: Record<string, string> = {
    string: '文字列',
    number: '数値',
    bigint: '大整数',
    boolean: '真偽値',
    date: '日付',
    undefined: '未定義',
    null: 'null',
    array: '配列',
    object: 'オブジェクト',
    function: '関数',
    symbol: 'シンボル',
    nan: 'NaN',
    void: 'void',
    unknown: '不明',
    never: 'never',
  };

  return typeMap[type] || type;
}
