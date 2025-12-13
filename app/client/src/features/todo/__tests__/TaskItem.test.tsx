import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Task } from '@/packages/shared-schemas/src/tasks';
import TaskItem from '../components/TaskItem';

// テスト用のモックタスクデータ
const createMockTask = (overrides?: Partial<Task>): Task => ({
  id: '550e8400-e29b-41d4-a716-446655440000',
  userId: '660e8400-e29b-41d4-a716-446655440001',
  title: 'サンプルタスク',
  description: 'これはサンプルタスクです',
  priority: 'medium',
  status: 'not_started',
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
  ...overrides,
});

describe('TaskItem', () => {
  let onEdit: ReturnType<typeof mock>;
  let onDelete: ReturnType<typeof mock>;
  let onStatusChange: ReturnType<typeof mock>;

  beforeEach(() => {
    onEdit = mock();
    onDelete = mock();
    onStatusChange = mock();
  });

  afterEach(() => {
    cleanup();
  });

  describe('タスク情報の表示', () => {
    it('タスクのタイトルが表示される', () => {
      const task = createMockTask({ title: 'テストタスク' });
      render(
        <TaskItem
          task={task}
          onEdit={onEdit}
          onDelete={onDelete}
          onStatusChange={onStatusChange}
        />,
      );

      expect(screen.getByText('テストタスク')).toBeDefined();
    });

    it('タスクの説明が表示される', () => {
      const task = createMockTask({
        description: 'これはテスト説明です',
      });
      render(
        <TaskItem
          task={task}
          onEdit={onEdit}
          onDelete={onDelete}
          onStatusChange={onStatusChange}
        />,
      );

      expect(screen.getByText('これはテスト説明です')).toBeDefined();
    });

    it('説明がnullの場合は表示されない', () => {
      const task = createMockTask({ description: null });
      render(
        <TaskItem
          task={task}
          onEdit={onEdit}
          onDelete={onDelete}
          onStatusChange={onStatusChange}
        />,
      );

      // タイトルは存在するが、説明テキストは存在しない
      expect(screen.getByText(task.title)).toBeDefined();
      expect(screen.queryByText(/これはサンプルタスクです/)).toBeNull();
    });

    it('説明が空文字列の場合は表示されない', () => {
      const task = createMockTask({ description: '' });
      const { container } = render(
        <TaskItem
          task={task}
          onEdit={onEdit}
          onDelete={onDelete}
          onStatusChange={onStatusChange}
        />,
      );

      // タイトルは存在する
      expect(screen.getByText(task.title)).toBeDefined();
      // 説明のMarkdownコンテナが存在しない
      const descriptionContainer = container.querySelector(
        '.text-gray-600.text-sm.mt-1',
      );
      expect(descriptionContainer).toBeNull();
    });
  });

  describe('優先度の表示', () => {
    it('高優先度タスクが表示される', () => {
      const task = createMockTask({ priority: 'high' });
      render(
        <TaskItem
          task={task}
          onEdit={onEdit}
          onDelete={onDelete}
          onStatusChange={onStatusChange}
        />,
      );

      expect(screen.getByText('高')).toBeDefined();
    });

    it('中優先度タスクが表示される', () => {
      const task = createMockTask({ priority: 'medium' });
      render(
        <TaskItem
          task={task}
          onEdit={onEdit}
          onDelete={onDelete}
          onStatusChange={onStatusChange}
        />,
      );

      expect(screen.getByText('中')).toBeDefined();
    });

    it('低優先度タスクが表示される', () => {
      const task = createMockTask({ priority: 'low' });
      render(
        <TaskItem
          task={task}
          onEdit={onEdit}
          onDelete={onDelete}
          onStatusChange={onStatusChange}
        />,
      );

      expect(screen.getByText('低')).toBeDefined();
    });
  });

  describe('ステータスバッジの表示', () => {
    it('未着手ステータスが表示される', () => {
      const task = createMockTask({ status: 'not_started' });
      render(
        <TaskItem
          task={task}
          onEdit={onEdit}
          onDelete={onDelete}
          onStatusChange={onStatusChange}
        />,
      );

      // バッジとセレクトボックスの両方に表示される
      const elements = screen.getAllByText('未着手');
      expect(elements.length).toBeGreaterThan(0);
    });

    it('進行中ステータスが表示される', () => {
      const task = createMockTask({ status: 'in_progress' });
      render(
        <TaskItem
          task={task}
          onEdit={onEdit}
          onDelete={onDelete}
          onStatusChange={onStatusChange}
        />,
      );

      // バッジとセレクトボックスの両方に表示される
      const elements = screen.getAllByText('進行中');
      expect(elements.length).toBeGreaterThan(0);
    });

    it('レビュー中ステータスが表示される', () => {
      const task = createMockTask({ status: 'in_review' });
      render(
        <TaskItem
          task={task}
          onEdit={onEdit}
          onDelete={onDelete}
          onStatusChange={onStatusChange}
        />,
      );

      // バッジとセレクトボックスの両方に表示される
      const elements = screen.getAllByText('レビュー中');
      expect(elements.length).toBeGreaterThan(0);
    });

    it('完了ステータスが表示される', () => {
      const task = createMockTask({ status: 'completed' });
      render(
        <TaskItem
          task={task}
          onEdit={onEdit}
          onDelete={onDelete}
          onStatusChange={onStatusChange}
        />,
      );

      // バッジとセレクトボックスの両方に表示される
      const elements = screen.getAllByText('完了');
      expect(elements.length).toBeGreaterThan(0);
    });
  });

  describe('イベントハンドラ', () => {
    it('編集ボタンをクリックするとonEditが呼び出される', async () => {
      const task = createMockTask();
      const user = userEvent.setup();
      render(
        <TaskItem
          task={task}
          onEdit={onEdit}
          onDelete={onDelete}
          onStatusChange={onStatusChange}
        />,
      );

      const editButton = screen.getByRole('button', { name: 'タスクを編集' });
      await user.click(editButton);

      expect(onEdit.mock.calls.length).toBe(1);
      expect(onEdit.mock.calls[0][0]).toEqual(task);
    });

    it('削除ボタンをクリックするとonDeleteが呼び出される', async () => {
      const task = createMockTask();
      const user = userEvent.setup();
      render(
        <TaskItem
          task={task}
          onEdit={onEdit}
          onDelete={onDelete}
          onStatusChange={onStatusChange}
        />,
      );

      const deleteButton = screen.getByRole('button', { name: 'タスクを削除' });
      await user.click(deleteButton);

      expect(onDelete.mock.calls.length).toBe(1);
      expect(onDelete.mock.calls[0][0]).toBe(task.id);
    });

    it('ステータスを変更するとonStatusChangeが呼び出される', async () => {
      const task = createMockTask({ status: 'not_started' });
      const user = userEvent.setup();
      render(
        <TaskItem
          task={task}
          onEdit={onEdit}
          onDelete={onDelete}
          onStatusChange={onStatusChange}
        />,
      );

      const statusSelect = screen.getByRole('combobox', {
        name: 'ステータスを変更',
      });
      await user.selectOptions(statusSelect, 'in_progress');

      expect(onStatusChange.mock.calls.length).toBe(1);
      expect(onStatusChange.mock.calls[0][0]).toBe(task.id);
      expect(onStatusChange.mock.calls[0][1]).toBe('in_progress');
    });

    it('ステータスが同じ値の場合はonStatusChangeが呼び出されない', async () => {
      const task = createMockTask({ status: 'not_started' });
      const user = userEvent.setup();
      render(
        <TaskItem
          task={task}
          onEdit={onEdit}
          onDelete={onDelete}
          onStatusChange={onStatusChange}
        />,
      );

      const statusSelect = screen.getByRole('combobox', {
        name: 'ステータスを変更',
      });
      await user.selectOptions(statusSelect, 'not_started');

      expect(onStatusChange.mock.calls.length).toBe(0);
    });
  });

  describe('UI/UXの動作', () => {
    it('タイトルが長い場合でも表示される', () => {
      const longTitle = 'a'.repeat(150);
      const task = createMockTask({ title: longTitle });
      render(
        <TaskItem
          task={task}
          onEdit={onEdit}
          onDelete={onDelete}
          onStatusChange={onStatusChange}
        />,
      );

      expect(screen.getByText(longTitle)).toBeDefined();
    });

    it('説明が長い場合でも表示される', () => {
      const longDescription =
        'これは長い説明です\nこれは2行目です\nこれは3行目です';
      const task = createMockTask({ description: longDescription });
      render(
        <TaskItem
          task={task}
          onEdit={onEdit}
          onDelete={onDelete}
          onStatusChange={onStatusChange}
        />,
      );

      // Markdownとして解釈されるため、改行は維持されている
      expect(
        screen.getByText(/これは長い説明です|これは2行目です|これは3行目です/),
      ).toBeDefined();
    });

    it('削除ボタンが表示される', () => {
      const task = createMockTask();
      render(
        <TaskItem
          task={task}
          onEdit={onEdit}
          onDelete={onDelete}
          onStatusChange={onStatusChange}
        />,
      );

      const deleteButton = screen.getByRole('button', { name: 'タスクを削除' });
      expect(deleteButton).toBeDefined();
    });
  });

  describe('アクセシビリティ', () => {
    it('編集ボタンにアクセス可能なラベルが設定されている', () => {
      const task = createMockTask();
      render(
        <TaskItem
          task={task}
          onEdit={onEdit}
          onDelete={onDelete}
          onStatusChange={onStatusChange}
        />,
      );

      const editButton = screen.getByRole('button', { name: 'タスクを編集' });
      expect(editButton).toBeDefined();
    });

    it('削除ボタンにアクセス可能なラベルが設定されている', () => {
      const task = createMockTask();
      render(
        <TaskItem
          task={task}
          onEdit={onEdit}
          onDelete={onDelete}
          onStatusChange={onStatusChange}
        />,
      );

      const deleteButton = screen.getByRole('button', { name: 'タスクを削除' });
      expect(deleteButton).toBeDefined();
    });

    it('ステータス選択にアクセス可能なラベルが設定されている', () => {
      const task = createMockTask();
      render(
        <TaskItem
          task={task}
          onEdit={onEdit}
          onDelete={onDelete}
          onStatusChange={onStatusChange}
        />,
      );

      const statusSelect = screen.getByRole('combobox', {
        name: 'ステータスを変更',
      });
      expect(statusSelect).toBeDefined();
    });
  });

  describe('Markdown表示', () => {
    it('見出しが正しく表示される', () => {
      const task = createMockTask({ description: '## サンプル見出し' });
      const { container } = render(
        <TaskItem
          task={task}
          onEdit={onEdit}
          onDelete={onDelete}
          onStatusChange={onStatusChange}
        />,
      );

      const headingElement = container.querySelector('h2');
      expect(headingElement?.textContent).toContain('サンプル見出し');
    });

    it('リストが正しく表示される', () => {
      const task = createMockTask({ description: '- 項目1\n- 項目2' });
      const { container } = render(
        <TaskItem
          task={task}
          onEdit={onEdit}
          onDelete={onDelete}
          onStatusChange={onStatusChange}
        />,
      );

      const listElements = container.querySelectorAll('li');
      expect(listElements.length >= 2).toBe(true);
    });

    it('太字が正しく表示される', () => {
      const task = createMockTask({ description: '**太字テキスト**' });
      const { container } = render(
        <TaskItem
          task={task}
          onEdit={onEdit}
          onDelete={onDelete}
          onStatusChange={onStatusChange}
        />,
      );

      const strongElement = container.querySelector('strong');
      expect(strongElement?.textContent).toContain('太字テキスト');
    });

    it('XSS攻撃が防止される', () => {
      const xssPayload = '<script>alert("XSS")</script>';
      const task = createMockTask({ description: xssPayload });
      const { container } = render(
        <TaskItem
          task={task}
          onEdit={onEdit}
          onDelete={onDelete}
          onStatusChange={onStatusChange}
        />,
      );

      const scriptElements = container.querySelectorAll('script');
      expect(scriptElements.length === 0).toBe(true);
    });
  });

  describe('パフォーマンス', () => {
    it('Propsが変更されると新しい内容が表示される', () => {
      const task1 = createMockTask({ title: 'タスク1' });
      const task2 = createMockTask({ title: 'タスク2' });
      const { rerender } = render(
        <TaskItem
          task={task1}
          onEdit={onEdit}
          onDelete={onDelete}
          onStatusChange={onStatusChange}
        />,
      );

      expect(screen.getByText('タスク1')).toBeDefined();

      rerender(
        <TaskItem
          task={task2}
          onEdit={onEdit}
          onDelete={onDelete}
          onStatusChange={onStatusChange}
        />,
      );

      expect(screen.getByText('タスク2')).toBeDefined();
    });
  });
});
