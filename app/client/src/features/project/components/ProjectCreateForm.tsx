'use client';

import React, { useState } from 'react';
import { useProjectServices } from '../lib/ProjectServicesContext';

/**
 * プロジェクト作成フォームコンポーネント
 *
 * ユーザーがプロジェクト名と説明文を入力してプロジェクトを作成するための
 * フォーム。クライアント側バリデーション（空文字・101文字超のエラー表示）
 * とエラーメッセージ表示機能を提供する。
 *
 * @example
 * ```tsx
 * <ProjectServicesProvider>
 *   <ProjectCreateForm />
 * </ProjectServicesProvider>
 * ```
 */
function ProjectCreateForm(): React.ReactNode {
  const { useProjectMutations } = useProjectServices();
  const { createProject } = useProjectMutations();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // エラークリア
    setError('');

    // クライアント側バリデーション：API側（trim後1〜100文字）と同一基準で検証
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('プロジェクト名を入力してください');
      return;
    }

    if (trimmedName.length > 100) {
      setError('プロジェクト名は100文字以内で入力してください');
      return;
    }

    createProject.mutate(
      {
        name: trimmedName,
        description: description.trim() === '' ? undefined : description,
      },
      {
        onSuccess: () => {
          setName('');
          setDescription('');
          setError('');
        },
        onError: (err: Error) => {
          setError(err.message);
        },
      },
    );
  };

  return (
    <div className="mb-4 sm:mb-6">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:gap-4">
        <div className="flex flex-col gap-1">
          <label
            htmlFor="project-name"
            className="text-sm sm:text-base font-medium"
          >
            プロジェクト名
          </label>
          <input
            id="project-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor="project-description"
            className="text-sm sm:text-base font-medium"
          >
            説明文
          </label>
          <textarea
            id="project-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        <button
          type="submit"
          className="px-4 sm:px-6 py-2 text-sm sm:text-base bg-primary text-white rounded-lg hover:bg-opacity-80 disabled:opacity-50 transition-colors whitespace-nowrap"
          disabled={createProject.isPending}
        >
          作成
        </button>
      </form>

      {/* エラーメッセージ表示 */}
      {error && (
        <div
          className="mt-2 sm:mt-3 p-3 bg-red-100 text-red-700 rounded-lg"
          role="alert"
          aria-live="polite"
        >
          <span className="text-sm">{error}</span>
        </div>
      )}
    </div>
  );
}

export default React.memo(ProjectCreateForm);
