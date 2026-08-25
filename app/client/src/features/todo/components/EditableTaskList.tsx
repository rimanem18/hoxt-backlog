'use client';

import type { Task } from '@hoxt-backlog/shared-schemas/tasks';
import { useState } from 'react';
import TaskEditModal from './TaskEditModal';
import TaskList from './TaskList';

interface EditableTaskListProps {
  projectId?: string;
}

export default function EditableTaskList(
  props: EditableTaskListProps,
): React.ReactNode {
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  return (
    <>
      <TaskList projectId={props.projectId} onEdit={setEditingTask} />
      <TaskEditModal task={editingTask} onClose={() => setEditingTask(null)} />
    </>
  );
}
