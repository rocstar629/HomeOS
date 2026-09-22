'use client';

import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTasks } from '@/hooks/useFamilyData';
import { useHomeAssistant } from '@/context/HomeAssistantContext';
import { ListTodo, Loader2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Task } from '@/types/family';

export default function TasksPage() {
  const tasks = useTasks();
  const { client, isMock } = useHomeAssistant();
  const queryClient = useQueryClient();

  // Demo mode has no backend to persist to; keep toggles local.
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const withState = useMemo(() => {
    if (!tasks.data) return [];
    return tasks.data.map((task) => ({
      ...task,
      completed: overrides[task.id] ?? task.completed,
    }));
  }, [tasks.data, overrides]);

  const open = withState.filter((t) => !t.completed);
  const done = withState.filter((t) => t.completed);

  const toggle = async (task: Task) => {
    const next = !task.completed;
    setError(null);

    if (isMock) {
      setOverrides((prev) => ({ ...prev, [task.id]: next }));
      return;
    }

    if (!task.listEntityId || !task.itemUid) {
      setError('This item can’t be updated — it came from Home Assistant without an id.');
      return;
    }

    setPendingId(task.id);
    try {
      await client.callService('todo', 'update_item', {
        entity_id: task.listEntityId,
        item_uid: task.itemUid,
        status: next ? 'completed' : 'needs_action',
      });
      await queryClient.invalidateQueries({ queryKey: ['ha-todos'] });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update that task.');
    } finally {
      setPendingId(null);
    }
  };

  if (tasks.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-zinc-400" aria-label="Loading" />
      </div>
    );
  }

  const renderRow = (task: Task) => (
    <label
      key={task.id}
      className="flex items-center gap-3 p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-colors"
    >
      <input
        type="checkbox"
        checked={task.completed}
        onChange={() => void toggle(task)}
        disabled={pendingId === task.id}
        className="sr-only peer"
        aria-label={`Mark ${task.title} as ${task.completed ? 'not done' : 'done'}`}
      />
      <span
        className={cn(
          'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
          'peer-focus-visible:ring-2 peer-focus-visible:ring-zinc-400',
          task.completed
            ? 'bg-green-500 border-green-500'
            : 'border-zinc-300 dark:border-zinc-600'
        )}
        aria-hidden
      >
        {pendingId === task.id ? (
          <Loader2 className="w-3 h-3 animate-spin text-white" />
        ) : task.completed ? (
          <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : null}
      </span>
      <span
        className={cn(
          'text-sm min-w-0',
          task.completed && 'line-through text-zinc-500'
        )}
      >
        {task.title}
        {task.dueDate && !task.completed && (
          <span className="block text-xs text-zinc-400">
            Due {new Date(task.dueDate).toLocaleDateString()}
          </span>
        )}
      </span>
    </label>
  );

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
          <p className="text-zinc-500">
            {withState.length > 0
              ? `${open.length} open · ${done.length} done`
              : 'Chores and to-dos for the household'}
          </p>
        </div>
        <ListTodo className="w-8 h-8 text-zinc-300" aria-hidden />
      </header>

      {(tasks.isError || error) && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 text-sm">
          <AlertTriangle className="w-5 h-5 shrink-0" aria-hidden />
          {error ?? "Couldn't reach Home Assistant for tasks."}
        </div>
      )}

      {withState.length === 0 ? (
        <div className="p-8 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-center space-y-3">
          <ListTodo className="w-10 h-10 mx-auto text-zinc-300" aria-hidden />
          <p className="font-medium">No tasks right now</p>
          <p className="text-sm text-zinc-500">
            To-do lists from Home Assistant (Shopping List, household lists, …) appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {open.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 mb-3">
                Open
              </h2>
              <div className="space-y-2">{open.map(renderRow)}</div>
            </section>
          )}
          {done.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 mb-3">
                Done
              </h2>
              <div className="space-y-2">{done.map(renderRow)}</div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
