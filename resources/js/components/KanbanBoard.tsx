"use client";

import { useState, useEffect } from 'react';
import { Task, Status } from '@/types/task';
import { Tag } from '@/types/tag';
import TaskCard from './TaskCard';
import TaskModal from './TaskModal';
import { Button } from '@/components/ui/button';
import { Plus, Archive } from 'lucide-react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  useDroppable,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { router } from '@inertiajs/react';
import axios from 'axios';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';

interface SortableTaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (id: string | number) => void;
  onArchive: (id: string | number) => void;
}

function SortableTaskCard({ task, onEdit, onDelete, onArchive }: SortableTaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard task={task} onEdit={onEdit} onDelete={onDelete} onArchive={onArchive} />
    </div>
  );
}

const columns: {
  id: Status;
  title: string;
  color: string;
  bgColor: string;
  darkBgColor: string;
  badgeColor: string;
}[] = [
  {
    id: 'todo',
    title: 'To Do',
    color: '#94a3b8',
    bgColor: 'bg-slate-50/50',
    darkBgColor: 'dark:bg-slate-800/50',
    badgeColor: 'bg-slate-200/60 text-slate-700 dark:bg-slate-700/60 dark:text-slate-300',
  },
  {
    id: 'in-progress',
    title: 'In Progress',
    color: '#3b82f6',
    bgColor: 'bg-blue-50/50',
    darkBgColor: 'dark:bg-blue-950/30',
    badgeColor: 'bg-blue-100/70 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
  },
  {
    id: 'in-review',
    title: 'In Review',
    color: '#f59e0b',
    bgColor: 'bg-amber-50/50',
    darkBgColor: 'dark:bg-amber-950/30',
    badgeColor: 'bg-amber-100/70 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
  },
  {
    id: 'done',
    title: 'Done',
    color: '#22c55e',
    bgColor: 'bg-green-50/50',
    darkBgColor: 'dark:bg-green-950/30',
    badgeColor: 'bg-green-100/70 text-green-700 dark:bg-green-900/50 dark:text-green-300',
  },
];

interface KanbanColumnProps {
  column: (typeof columns)[0];
  tasks: Task[];
  quickAddCol: Status | null;
  setQuickAddCol: (val: Status | null) => void;
  quickAddText: string;
  setQuickAddText: (val: string) => void;
  handleQuickAdd: (status: Status) => void;
  handleEditTask: (task: Task) => void;
  handleDeleteTask: (id: string | number) => void;
  handleArchiveTask: (id: string | number) => void;
  handleArchiveAllDone?: () => void;
  themeColor: string;
  wipLimit?: number;
}

function KanbanColumn({
  column,
  tasks,
  quickAddCol,
  setQuickAddCol,
  quickAddText,
  setQuickAddText,
  handleQuickAdd,
  handleEditTask,
  handleDeleteTask,
  handleArchiveTask,
  handleArchiveAllDone,
  themeColor,
  wipLimit,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  const unarchivedDoneCount =
    column.id === 'done' ? tasks.filter((t) => !t.archived_at).length : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: columns.findIndex((c) => c.id === column.id) * 0.1 }}
      ref={setNodeRef}
      className={`flex flex-col ${column.bgColor} ${column.darkBgColor} backdrop-blur-xl rounded-2xl p-3 border shadow-sm min-h-[600px] transition-all duration-300 ${
        isOver ? 'animate-shake' : 'hover:shadow-md'
      }`}
      style={{
        borderColor: isOver ? '#ef4444' : `${themeColor}40`,
        boxShadow: isOver ? '0 0 30px rgba(239, 68, 68, 0.6)' : `0 0 20px ${themeColor}10`,
        transform: isOver ? 'scale(1.02)' : 'scale(1)',
      }}
    >
      <div className="flex items-center justify-between px-2 py-3 mb-2">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: column.color }} />
          <h2 className="text-sm font-semibold" style={{ color: column.color }}>
            {column.title}
          </h2>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              wipLimit && tasks.length > wipLimit
                ? 'bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400 animate-pulse'
                : column.badgeColor
            }`}
          >
            {tasks.length}
            {wipLimit ? `/${wipLimit}` : ''}
          </span>
          {wipLimit && tasks.length > wipLimit && (
            <span className="text-[10px] text-red-500 font-medium">⚠</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {column.id === 'done' && unarchivedDoneCount > 0 && handleArchiveAllDone && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleArchiveAllDone}
              title="Archive all completed tasks to keep board clean"
              className="h-7 px-2 text-[11px] font-medium text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/15 rounded-lg flex items-center gap-1"
            >
              <Archive className="h-3.5 w-3.5" />
              Archive ({unarchivedDoneCount})
            </Button>
          )}
          <Button
            size="sm"
            onClick={() => {
              if (quickAddCol === column.id) {
                setQuickAddCol(null);
              } else {
                setQuickAddCol(column.id);
              }
            }}
            className="h-7 w-7 p-0 rounded-lg transition-colors"
            style={{
              backgroundColor: 'transparent',
              color: column.color,
              opacity: 0.5,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '1';
              e.currentTarget.style.backgroundColor = column.color + '15';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '0.5';
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <Plus
              className={`h-4 w-4 transition-transform ${
                quickAddCol === column.id ? 'rotate-45' : ''
              }`}
            />
          </Button>
        </div>
      </div>

      {quickAddCol === column.id && (
        <div className="mb-3 px-1">
          <input
            autoFocus
            type="text"
            placeholder="Type task title..."
            className="w-full px-3 py-2 text-sm rounded-lg border-0 ring-1 ring-inset ring-gray-200 dark:ring-gray-700 focus:ring-2 focus:ring-blue-500 shadow-sm bg-white dark:bg-slate-700 dark:text-white"
            value={quickAddText}
            onChange={(e) => setQuickAddText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleQuickAdd(column.id);
              if (e.key === 'Escape') setQuickAddCol(null);
            }}
          />
        </div>
      )}

      {/* Droppable Area */}
      <SortableContext
        items={tasks.map((task) => task.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex-1 pr-1 space-y-3">
          {tasks.map((task) => (
            <SortableTaskCard
              key={task.id}
              task={task}
              onEdit={handleEditTask}
              onDelete={handleDeleteTask}
              onArchive={handleArchiveTask}
            />
          ))}

          {tasks.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <p className="text-sm">No tasks yet</p>
              <p className="text-xs mt-1">Click + to add one</p>
            </div>
          )}
        </div>
      </SortableContext>
    </motion.div>
  );
}

interface KanbanBoardProps {
  initialTasks?: Task[];
  openModalOnMount?: boolean;
  themeColor?: string;
  activeBoardId?: number;
  wipLimits?: Record<string, number>;
  availableTags?: Tag[];
  externalEditTask?: Task | null;
  onClearExternalEdit?: () => void;
}

export default function KanbanBoard({
  initialTasks = [],
  openModalOnMount = false,
  themeColor = '#4A90E2',
  activeBoardId,
  wipLimits = {},
  availableTags = [],
  externalEditTask = null,
  onClearExternalEdit,
}: KanbanBoardProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);

  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [defaultStatus] = useState<Status>('todo');
  const [activeId, setActiveId] = useState<string | number | null>(null);

  // Quick Add State
  const [quickAddCol, setQuickAddCol] = useState<Status | null>(null);
  const [quickAddText, setQuickAddText] = useState('');

  useEffect(() => {
    if (openModalOnMount) {
      setEditingTask(null);
      setModalOpen(true);
    }
  }, [openModalOnMount]);

  useEffect(() => {
    if (externalEditTask) {
      setEditingTask(externalEditTask);
      setModalOpen(true);
    }
  }, [externalEditTask]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setModalOpen(true);
  };

  const handleDeleteTask = (id: string | number) => {
    setTasks(tasks.filter((task) => task.id !== id));
    router.delete(`/tasks/${id}`);
  };

  const handleArchiveTask = async (id: string | number) => {
    try {
      await axios.post(
        `/tasks/${id}/archive`,
        {},
        {
          headers: { Accept: 'application/json' },
        }
      );
      router.reload({ only: ['tasks', 'archivedCount'] });
    } catch (error) {
      console.error('Failed to archive/restore task:', error);
    }
  };

  const handleArchiveAllDone = async () => {
    if (!activeBoardId) return;
    try {
      await axios.post(
        `/boards/${activeBoardId}/archive-done`,
        {},
        {
          headers: { Accept: 'application/json' },
        }
      );
      router.reload({ only: ['tasks', 'archivedCount'] });
    } catch (error) {
      console.error('Failed to archive done tasks:', error);
    }
  };

  const handleQuickAdd = async (status: Status) => {
    if (!quickAddText.trim()) {
      setQuickAddCol(null);
      return;
    }

    try {
      await axios.post(
        '/tasks',
        {
          title: quickAddText,
          status: status,
          priority: 'medium',
          board_id: activeBoardId,
        },
        {
          headers: { Accept: 'application/json' },
        }
      );

      setQuickAddText('');
      setQuickAddCol(null);
      router.reload({ only: ['tasks'] });
    } catch (error) {
      console.error('Quick add failed:', error);
    }
  };

  const handleSaveTask = (
    taskData: Omit<Task, 'id' | 'createdAt' | 'updated_at'> & { id?: string | number }
  ) => {
    const payload = {
      ...taskData,
      tags: taskData.tags?.map((t) => t.id) || [],
    };

    if (taskData.id) {
      router.put(`/tasks/${taskData.id}`, payload as any, {
        onSuccess: () => setModalOpen(false),
      });
    } else {
      router.post('/tasks', { ...payload, board_id: activeBoardId } as any, {
        onSuccess: () => setModalOpen(false),
      });
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string | number);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeTask = tasks.find((task) => task.id == active.id);
    if (!activeTask) return;

    let newStatus: Status | undefined;

    const overColumn = columns.find((col) => col.id === over.id);
    if (overColumn) {
      newStatus = overColumn.id;
    } else {
      const overTask = tasks.find((task) => task.id == over.id);
      if (overTask) {
        newStatus = overTask.status;
      }
    }

    if (newStatus && activeTask.status !== newStatus) {
      setTasks(
        tasks.map((task) =>
          task.id == active.id ? { ...task, status: newStatus as Status } : task
        )
      );

      if (newStatus === 'done') {
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#a855f7'],
        });
      }

      axios
        .put(
          `/tasks/${activeTask.id}`,
          { status: newStatus },
          {
            headers: { Accept: 'application/json' },
          }
        )
        .then(() => {
          router.reload({ only: ['tasks'] });
        })
        .catch((error) => {
          console.error('Axios update failed:', error);
        });
    }
  };

  const getTasksByStatus = (status: Status) => {
    return tasks.filter((task) => task.status === status);
  };

  const activeTask = activeId ? tasks.find((task) => task.id == activeId) : null;

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {columns.map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
              tasks={getTasksByStatus(column.id)}
              quickAddCol={quickAddCol}
              setQuickAddCol={setQuickAddCol}
              quickAddText={quickAddText}
              setQuickAddText={setQuickAddText}
              handleQuickAdd={handleQuickAdd}
              handleEditTask={handleEditTask}
              handleDeleteTask={handleDeleteTask}
              handleArchiveTask={handleArchiveTask}
              handleArchiveAllDone={handleArchiveAllDone}
              themeColor={themeColor}
              wipLimit={wipLimits[column.id]}
            />
          ))}
        </div>

        <DragOverlay>
          {activeTask ? (
            <div className="rotate-3 scale-105">
              <TaskCard
                task={activeTask}
                onEdit={() => {}}
                onDelete={() => {}}
                isOverlay={true}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <TaskModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingTask(null);
          if (onClearExternalEdit) onClearExternalEdit();
        }}
        onSave={handleSaveTask}
        task={editingTask}
        defaultStatus={defaultStatus}
        availableTags={availableTags}
        activeBoardId={activeBoardId}
      />
    </>
  );
}
