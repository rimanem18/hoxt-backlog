import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import type { Project } from '@hoxt-backlog/shared-schemas/projects';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProjectEditForm from '../components/ProjectEditForm';
import { ProjectServicesProvider } from '../lib/ProjectServicesContext';

const mockProject: Project = {
  id: '550e8400-e29b-41d4-a716-446655440001',
  userId: 'user-1',
  name: 'プロジェクトA',
  description: '説明A',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function renderWithProviders(
  project: Project | null,
  updateProject: () => {
    mutate: (...args: unknown[]) => void;
    isPending: boolean;
  },
  onClose: () => void = mock(),
) {
  return render(
    <ProjectServicesProvider
      services={{
        useProjects: mock(),
        useProjectMutations: mock(() => ({
          createProject: { mutate: mock(), isPending: false },
          updateProject: updateProject(),
        })),
        useProject: mock(),
      }}
    >
      <ProjectEditForm project={project} onClose={onClose} />
    </ProjectServicesProvider>,
  );
}

describe('ProjectEditForm', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
  });

  afterEach(() => {
    cleanup();
    mock.restore();
    mock.clearAllMocks();
  });

  test('project未指定の場合は何も表示されない', () => {
    // Given: projectがnull
    const { container } = renderWithProviders(null, () => ({
      mutate: mock(),
      isPending: false,
    }));

    // Then: 何も描画されない
    expect(container.firstChild).toBeNull();
  });

  test('既存の値がフォームに初期表示される', () => {
    // Given: 既存のprojectを渡す
    renderWithProviders(mockProject, () => ({
      mutate: mock(),
      isPending: false,
    }));

    // Then: 名称・説明文が初期表示される
    expect(screen.getByLabelText('プロジェクト名')).toHaveValue(
      'プロジェクトA',
    );
    expect(screen.getByLabelText('説明文')).toHaveValue('説明A');
  });

  test('名称のみ変更して保存できる', async () => {
    // Given: ProjectEditFormが表示されている
    const mockMutate = mock(() => {});
    renderWithProviders(mockProject, () => ({
      mutate: mockMutate,
      isPending: false,
    }));

    // When: 名称を変更して保存
    const nameInput = screen.getByLabelText('プロジェクト名');
    await user.clear(nameInput);
    await user.type(nameInput, '更新後の名前');
    await user.click(screen.getByRole('button', { name: '保存' }));

    // Then: updateProject.mutateが正しい引数で呼ばれる
    expect(mockMutate).toHaveBeenCalledWith(
      {
        id: mockProject.id,
        input: { name: '更新後の名前', description: '説明A' },
      },
      expect.any(Object),
    );
  });

  test('説明文のみ変更して保存できる', async () => {
    // Given: ProjectEditFormが表示されている
    const mockMutate = mock(() => {});
    renderWithProviders(mockProject, () => ({
      mutate: mockMutate,
      isPending: false,
    }));

    // When: 説明文を変更して保存
    const descInput = screen.getByLabelText('説明文');
    await user.clear(descInput);
    await user.type(descInput, '更新後の説明');
    await user.click(screen.getByRole('button', { name: '保存' }));

    // Then: updateProject.mutateが正しい引数で呼ばれる
    expect(mockMutate).toHaveBeenCalledWith(
      {
        id: mockProject.id,
        input: { name: 'プロジェクトA', description: '更新後の説明' },
      },
      expect.any(Object),
    );
  });

  test('空白のみの名称はエラーが表示され送信されない', async () => {
    // Given: ProjectEditFormが表示されている
    const mockMutate = mock(() => {});
    renderWithProviders(mockProject, () => ({
      mutate: mockMutate,
      isPending: false,
    }));

    // When: 名称を空白のみに変更して保存
    const nameInput = screen.getByLabelText('プロジェクト名');
    await user.clear(nameInput);
    await user.type(nameInput, '   ');
    await user.click(screen.getByRole('button', { name: '保存' }));

    // Then: エラーメッセージが表示され、送信されない
    expect(screen.getByText('プロジェクト名を入力してください')).toBeDefined();
    expect(mockMutate).not.toHaveBeenCalled();
  });

  test('101文字超の名称はエラーが表示され送信されない', async () => {
    // Given: ProjectEditFormが表示されている
    const mockMutate = mock(() => {});
    renderWithProviders(mockProject, () => ({
      mutate: mockMutate,
      isPending: false,
    }));

    // When: 101文字の名称に変更して保存
    const nameInput = screen.getByLabelText('プロジェクト名');
    await user.clear(nameInput);
    await user.type(nameInput, 'a'.repeat(101));
    await user.click(screen.getByRole('button', { name: '保存' }));

    // Then: エラーメッセージが表示され、送信されない
    expect(
      screen.getByText('プロジェクト名は100文字以内で入力してください'),
    ).toBeDefined();
    expect(mockMutate).not.toHaveBeenCalled();
  });

  test('保存成功時にonCloseが呼ばれる', async () => {
    // Given: 更新が成功する設定
    const mockOnClose = mock();
    const mockMutateSuccess = mock((_input, { onSuccess }) => {
      onSuccess?.();
    });
    renderWithProviders(
      mockProject,
      () => ({ mutate: mockMutateSuccess, isPending: false }),
      mockOnClose,
    );

    // When: 保存ボタンをクリック
    await user.click(screen.getByRole('button', { name: '保存' }));

    // Then: onCloseが呼ばれる
    expect(mockOnClose).toHaveBeenCalled();
  });

  test('APIエラー時にエラーメッセージが表示される', async () => {
    // Given: 更新が失敗する設定（例: 他ユーザーprojectへの404）
    const mockMutateError = mock((_input, { onError }) => {
      onError?.(new Error('プロジェクトが見つかりません'));
    });
    renderWithProviders(mockProject, () => ({
      mutate: mockMutateError,
      isPending: false,
    }));

    // When: 保存ボタンをクリック
    await user.click(screen.getByRole('button', { name: '保存' }));

    // Then: エラーメッセージが表示される
    expect(screen.getByText('プロジェクトが見つかりません')).toBeDefined();
  });

  test('送信中は保存ボタンが無効化される', () => {
    // Given: 送信中の状態
    renderWithProviders(mockProject, () => ({
      mutate: mock(),
      isPending: true,
    }));

    // Then: 保存ボタンが無効化される
    expect(screen.getByRole('button', { name: '保存' })).toBeDisabled();
  });

  test('キャンセルボタンでonCloseが呼ばれる', async () => {
    // Given: ProjectEditFormが表示されている
    const mockOnClose = mock();
    renderWithProviders(
      mockProject,
      () => ({ mutate: mock(), isPending: false }),
      mockOnClose,
    );

    // When: キャンセルボタンをクリック
    await user.click(screen.getByRole('button', { name: 'キャンセル' }));

    // Then: onCloseが呼ばれる
    expect(mockOnClose).toHaveBeenCalled();
  });
});
