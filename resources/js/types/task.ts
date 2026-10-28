import { Tag } from './tag';

export type Priority = 'low' | 'medium' | 'high';
export type Status = 'todo' | 'in-progress' | 'in-review' | 'done';
export type RecurrenceInterval = 'none' | 'monthly' | 'quarterly' | 'yearly';

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Task {
  id: string | number;
  board_id?: number;
  title: string;
  description: string;
  subtasks?: Subtask[] | null;
  priority: Priority;
  status: Status;
  due_date?: string | null;
  recurrence_interval?: RecurrenceInterval;
  archived_at?: string | null;
  tags?: Tag[];
  updated_at?: string;
  created_at?: string;
}
