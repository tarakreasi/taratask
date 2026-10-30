"use client";

import { useState, useRef, useEffect } from 'react';
import { Task } from '@/types/task';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Edit2,
  Trash2,
  MoreHorizontal,
  Clock,
  Calendar,
  MessageSquare,
  Tag as TagIcon,
  Repeat,
  CheckSquare,
  Archive,
  ArchiveRestore,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { router } from '@inertiajs/react';
import axios from 'axios';

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (id: string | number) => void;
  onArchive?: (id: string | number) => void;
  onQuickStatusChange?: (task: Task, newStatus: Task['status']) => void;
  isOverlay?: boolean;
}

const priorityStyles = {
  low: {
    badge: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
    text: 'Low Priority',
  },
  medium: {
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    text: 'Medium Priority',
  },
  high: {
    badge: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
    text: 'High Priority',
  },
};

const recurrenceLabels: Record<string, string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
};

const getDueDateStyle = (dueDate: string | null | undefined, status: string) => {
  if (!dueDate) return null;
  const due = new Date(dueDate);
  const now = new Date();
  const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (status === 'done') {
    return {
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-950/30',
      label: due.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    };
  }

  if (diffDays < 0)
    return {
      color: 'text-rose-600 dark:text-rose-400',
      bg: 'bg-rose-50 dark:bg-rose-950/30 ring-1 ring-rose-500/30',
      label: `Overdue (${Math.abs(diffDays)}d)`,
    };
  if (diffDays === 0)
    return {
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-950/30 ring-1 ring-amber-500/30',
      label: 'Due Today',
    };
  if (diffDays <= 7)
    return {
      color: 'text-orange-600 dark:text-orange-400',
      bg: 'bg-orange-50 dark:bg-orange-950/30',
      label: `${diffDays}d left`,
    };
  if (diffDays <= 30)
    return {
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50/70 dark:bg-amber-950/20',
      label: `${diffDays}d (${due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`,
    };
  return {
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    label: due.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
  };
};

export default function TaskCard({
  task,
  onEdit,
  onDelete,
  onArchive,
  onQuickStatusChange,
  isOverlay,
}: TaskCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTitle(task.title);
  }, [task.title]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleSave = async () => {
    if (title.trim() === task.title) {
      setIsEditing(false);
      return;
    }

    if (!title.trim()) {
      setTitle(task.title);
      setIsEditing(false);
      return;
    }

    try {
      await axios.put(
        `/tasks/${task.id}`,
        {
          title: title,
        },
        {
          headers: { Accept: 'application/json' },
        }
      );

      setIsEditing(false);
      router.reload({ only: ['tasks'] });
    } catch (error) {
      console.error('Failed to update task:', error);
      setTitle(task.title);
      setIsEditing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') {
      setTitle(task.title);
      setIsEditing(false);
    }
  };

  const subtasks = Array.isArray(task.subtasks) ? task.subtasks : [];
  const completedSubtasks = subtasks.filter((s) => s.completed).length;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
    >
      <Card
        className={`relative overflow-hidden p-4 backdrop-blur-xl transition-all cursor-grab active:cursor-grabbing group rounded-xl
        ${
          task.archived_at
            ? 'opacity-70 border-dashed bg-slate-100/60 dark:bg-slate-900/50 border-gray-300 dark:border-slate-700'
            : isOverlay
              ? 'bg-white/90 dark:bg-slate-800/90 border-orange-500 dark:border-orange-400 shadow-[0_0_20px_rgba(249,115,22,0.4)] dark:shadow-[0_0_20px_rgba(251,146,60,0.3)] scale-[1.02] ring-1 ring-orange-400/50'
              : 'bg-white/60 dark:bg-slate-800/60 hover:bg-white/80 dark:hover:bg-slate-700/80 border border-gray-200/80 dark:border-white/10 shadow-[0_4px_20px_0_rgba(0,0,0,0.02)]'
        }`}
      >
        {/* Subtle Noise Texture Overlay */}
        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />

        <div className="flex justify-between items-start mb-2 relative z-10">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={`${priorityStyles[task.priority].badge} bg-opacity-70 dark:bg-opacity-20 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md`}
            >
              {task.priority}
            </span>
            {task.recurrence_interval && task.recurrence_interval !== 'none' && (
              <span
                className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-purple-100/80 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300"
                title={`Recurring: ${recurrenceLabels[task.recurrence_interval]}`}
              >
                <Repeat className="w-2.5 h-2.5" />
                {recurrenceLabels[task.recurrence_interval]}
              </span>
            )}
            {task.archived_at && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-gray-200 text-gray-600 dark:bg-slate-700 dark:text-gray-300">
                Archived
              </span>
            )}
          </div>
          <button
            onClick={() => onEdit(task)}
            className="p-1 -mr-1 -mt-1 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
            aria-label="Edit task details"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>

        {/* Due Date Badge */}
        {task.due_date &&
          (() => {
            const style = getDueDateStyle(task.due_date, task.status);
            return style ? (
              <div
                className={`flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md mb-2 w-fit relative z-10 ${style.bg} ${style.color}`}
              >
                <Clock className="w-3 h-3" />
                {style.label}
              </div>
            ) : null;
          })()}

        {/* Tags */}
        {task.tags && task.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2 relative z-10">
            {task.tags.map((tag) => (
              <span
                key={tag.id}
                className="text-[10px] font-medium px-1.5 py-0.5 rounded-md border"
                style={{
                  backgroundColor: tag.color + '15',
                  color: tag.color,
                  borderColor: tag.color + '40',
                }}
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}

        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            className="w-full text-sm font-medium mb-2 leading-snug p-1 -ml-1 rounded border-blue-300 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 dark:text-white dark:border-slate-700 relative z-10"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <h4
            onClick={() => {
              if (typeof window !== 'undefined' && window.innerWidth < 768) {
                onEdit(task);
              }
            }}
            onDoubleClick={() => setIsEditing(true)}
            className="text-gray-800 dark:text-gray-100 font-medium text-sm mb-2 leading-snug cursor-pointer md:cursor-text hover:text-blue-600 dark:hover:text-blue-400 transition-colors relative z-10"
            title="Tap to open on mobile, double-click to inline edit on desktop"
          >
            {task.title}
          </h4>
        )}

        {task.description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 line-clamp-2 relative z-10">
            {task.description}
          </p>
        )}

        {/* Subtasks Progress Indicator */}
        {subtasks.length > 0 && (
          <div className="mb-3 relative z-10">
            <div className="flex items-center justify-between text-[10px] text-gray-500 dark:text-gray-400 mb-1">
              <span className="flex items-center gap-1 font-medium">
                <CheckSquare className="w-3 h-3 text-blue-500" />
                Checklist
              </span>
              <span className="font-semibold">
                {completedSubtasks}/{subtasks.length}
              </span>
            </div>
            <div className="w-full h-1.5 bg-gray-200/70 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all duration-300 rounded-full"
                style={{ width: `${Math.round((completedSubtasks / subtasks.length) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Mobile Quick Status Switcher (1-tap move without dragging) */}
        {onQuickStatusChange && !isOverlay && (
          <div className="flex md:hidden items-center gap-1 mt-2 pt-2 border-t border-gray-100/80 dark:border-slate-700/40 relative z-10 overflow-x-auto">
            {(
              [
                { id: 'todo', label: 'To Do' },
                { id: 'in-progress', label: 'Doing' },
                { id: 'in-review', label: 'Review' },
                { id: 'done', label: 'Done' },
              ] as const
            ).map((st) => {
              const active = task.status === st.id;
              return (
                <button
                  key={st.id}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!active) onQuickStatusChange(task, st.id);
                  }}
                  className={`flex-1 py-1 px-1.5 rounded-md text-[10px] font-semibold transition-all whitespace-nowrap ${
                    active
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-gray-100/80 dark:bg-slate-700/60 text-gray-600 dark:text-gray-300 active:scale-95'
                  }`}
                >
                  {st.label}
                </button>
              );
            })}
          </div>
        )}

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-gray-700/50 relative z-10">
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(task)}
              title="Edit task"
              className="h-8 w-8 md:h-7 md:w-7 p-0 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-500 dark:hover:text-blue-400 rounded-lg opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
            >
              <Edit2 className="h-3.5 w-3.5" />
            </Button>
            {onArchive && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onArchive(task.id)}
                title={task.archived_at ? 'Restore from archive' : 'Archive task'}
                className="h-8 w-8 md:h-7 md:w-7 p-0 hover:bg-amber-50 dark:hover:bg-amber-900/30 hover:text-amber-600 dark:hover:text-amber-400 rounded-lg opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
              >
                {task.archived_at ? (
                  <ArchiveRestore className="h-3.5 w-3.5" />
                ) : (
                  <Archive className="h-3.5 w-3.5" />
                )}
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(task.id)}
              title="Delete task"
              className="h-8 w-8 md:h-7 md:w-7 p-0 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-500 dark:hover:text-red-400 rounded-lg opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="flex items-center gap-3">
            {/* Metadata Indicators */}
            <div className="flex items-center gap-2 text-[10px] text-gray-400 dark:text-gray-500">
              {(task as any).comments?.length > 0 && (
                <span className="flex items-center gap-0.5">
                  <MessageSquare className="w-3 h-3" />
                  {(task as any).comments.length}
                </span>
              )}
              {task.tags && task.tags.length > 0 && (
                <span className="flex items-center gap-0.5">
                  <TagIcon className="w-3 h-3" />
                  {task.tags.length}
                </span>
              )}
            </div>

            <div className="text-gray-400 dark:text-gray-500 text-[10px] flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {new Date((task as any).created_at || Date.now()).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
