import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProjectCreateForm from '../components/ProjectCreateForm';
import { ProjectServicesProvider } from '../lib/ProjectServicesContext';

function renderWithProviders(
  useProjectMutations: () => {
    createProject: { mutate: (...args: unknown[]) => void; isPending: boolean };
  },
) {
  return render(
    <ProjectServicesProvider
      services={{
        useProjects: mock(),
        useProjectMutations,
        useProject: mock(),
      }}
    >
      <ProjectCreateForm />
    </ProjectServicesProvider>,
  );
}

describe('ProjectCreateForm', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
  });

  afterEach(() => {
    cleanup();
    mock.restore();
    mock.clearAllMocks();
  });

  // 正常系テストケース

  test('名前のみでプロジェクトが作成される', async () => {
    // Given: ProjectCreateFormが表示されている
    const mockMutate = mock(() => {});
    const mockUseProjectMutations = mock(() => ({
      createProject: { mutate: mockMutate, isPending: false },
    }));

    renderWithProviders(mockUseProjectMutations);

    // When: 名前を入力して作成ボタンをクリック
    await user.type(
      screen.getByLabelText('プロジェクト名'),
      '新規プロジェクト',
    );
    await user.click(screen.getByRole('button', { name: '作成' }));

    // Then: createProject.mutateが正しい引数で呼ばれる
    expect(mockMutate).toHaveBeenCalledWith(
      { name: '新規プロジェクト', description: undefined },
      expect.any(Object),
    );
  });

  test('名前と説明文でプロジェクトが作成される', async () => {
    // Given: ProjectCreateFormが表示されている
    const mockMutate = mock(() => {});
    const mockUseProjectMutations = mock(() => ({
      createProject: { mutate: mockMutate, isPending: false },
    }));

    renderWithProviders(mockUseProjectMutations);

    // When: 名前と説明文を入力して作成ボタンをクリック
    await user.type(
      screen.getByLabelText('プロジェクト名'),
      '新規プロジェクト',
    );
    await user.type(screen.getByLabelText('説明文'), '説明テキスト');
    await user.click(screen.getByRole('button', { name: '作成' }));

    // Then: createProject.mutateが正しい引数で呼ばれる
    expect(mockMutate).toHaveBeenCalledWith(
      { name: '新規プロジェクト', description: '説明テキスト' },
      expect.any(Object),
    );
  });

  test('作成成功後にフォームがリセットされる', async () => {
    // Given: 作成が成功する設定
    const mockMutateSuccess = mock((_input, { onSuccess }) => {
      onSuccess?.();
    });
    const mockUseProjectMutations = mock(() => ({
      createProject: { mutate: mockMutateSuccess, isPending: false },
    }));

    renderWithProviders(mockUseProjectMutations);

    // When: プロジェクトを作成
    const nameInput = screen.getByLabelText('プロジェクト名');
    await user.type(nameInput, '新規プロジェクト');
    await user.click(screen.getByRole('button', { name: '作成' }));

    // Then: フォームがリセットされる
    expect(nameInput).toHaveValue('');
  });

  // 異常系テストケース

  test('空文字列の場合はエラーが表示され送信されない', async () => {
    // Given: ProjectCreateFormが表示されている
    const mockMutate = mock(() => {});
    const mockUseProjectMutations = mock(() => ({
      createProject: { mutate: mockMutate, isPending: false },
    }));

    renderWithProviders(mockUseProjectMutations);

    // When: 未入力のまま作成ボタンをクリック
    await user.click(screen.getByRole('button', { name: '作成' }));

    // Then: エラーメッセージが表示され、送信されない
    expect(screen.getByText('プロジェクト名を入力してください')).toBeDefined();
    expect(mockMutate).not.toHaveBeenCalled();
  });

  test('空白のみの場合はエラーが表示され送信されない', async () => {
    // Given: ProjectCreateFormが表示されている
    const mockMutate = mock(() => {});
    const mockUseProjectMutations = mock(() => ({
      createProject: { mutate: mockMutate, isPending: false },
    }));

    renderWithProviders(mockUseProjectMutations);

    // When: 空白のみを入力して作成ボタンをクリック
    await user.type(screen.getByLabelText('プロジェクト名'), '   ');
    await user.click(screen.getByRole('button', { name: '作成' }));

    // Then: エラーメッセージが表示され、送信されない
    expect(screen.getByText('プロジェクト名を入力してください')).toBeDefined();
    expect(mockMutate).not.toHaveBeenCalled();
  });

  test('101文字以上の場合はエラーが表示され送信されない', async () => {
    // Given: ProjectCreateFormが表示されている
    const mockMutate = mock(() => {});
    const mockUseProjectMutations = mock(() => ({
      createProject: { mutate: mockMutate, isPending: false },
    }));

    renderWithProviders(mockUseProjectMutations);

    // When: 101文字を入力して作成ボタンをクリック
    await user.type(screen.getByLabelText('プロジェクト名'), 'a'.repeat(101));
    await user.click(screen.getByRole('button', { name: '作成' }));

    // Then: エラーメッセージが表示され、送信されない
    expect(
      screen.getByText('プロジェクト名は100文字以内で入力してください'),
    ).toBeDefined();
    expect(mockMutate).not.toHaveBeenCalled();
  });

  test('送信中は作成ボタンが無効化される', () => {
    // Given: 送信中の状態を返すモック
    const mockUseProjectMutations = mock(() => ({
      createProject: { mutate: mock(() => {}), isPending: true },
    }));

    renderWithProviders(mockUseProjectMutations);

    // When & Then: 作成ボタンが無効化されている
    expect(screen.getByRole('button', { name: '作成' })).toBeDisabled();
  });
});
