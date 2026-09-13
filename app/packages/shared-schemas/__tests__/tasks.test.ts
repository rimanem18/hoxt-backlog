import { describe, expect, test } from 'bun:test';
import {
  taskPrioritySchema,
  taskPriorityLabels,
  taskStatusSchema,
  taskStatusLabels,
} from '../src/tasks';

describe('taskStatusLabels', () => {
  test('全ステータス値に対応する日本語ラベルが定義されている', () => {
    // Given: taskStatusSchemaが定義する全ステータス値
    const statuses = taskStatusSchema.options;

    // When & Then: 各値がtaskStatusLabelsのキーとして存在し、空文字でない
    for (const status of statuses) {
      expect(taskStatusLabels[status]).toBeDefined();
      expect(taskStatusLabels[status].length).toBeGreaterThan(0);
    }
  });

  test('既存の表示ラベルと一致する', () => {
    // Given & When & Then: 既存TaskItem.tsxの表示文言と同一であること
    expect(taskStatusLabels.not_started).toBe('未着手');
    expect(taskStatusLabels.in_progress).toBe('進行中');
    expect(taskStatusLabels.in_review).toBe('レビュー中');
    expect(taskStatusLabels.completed).toBe('完了');
  });
});

describe('taskPriorityLabels', () => {
  test('全優先度値に対応する日本語ラベルが定義されている', () => {
    // Given: taskPrioritySchemaが定義する全優先度値
    const priorities = taskPrioritySchema.options;

    // When & Then: 各値がtaskPriorityLabelsのキーとして存在し、空文字でない
    for (const priority of priorities) {
      expect(taskPriorityLabels[priority]).toBeDefined();
      expect(taskPriorityLabels[priority].length).toBeGreaterThan(0);
    }
  });

  test('既存の表示ラベルと一致する', () => {
    // Given & When & Then: 既存TaskItem.tsxの表示文言と同一であること
    expect(taskPriorityLabels.high).toBe('高');
    expect(taskPriorityLabels.medium).toBe('中');
    expect(taskPriorityLabels.low).toBe('低');
  });
});
