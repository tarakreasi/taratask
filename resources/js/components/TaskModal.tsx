"use client";

import { useState, useEffect, useRef } from 'react';
import { Task, Priority, Status, RecurrenceInterval, Subtask } from '@/types/task';
import { Tag } from '@/types/tag';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plus, X, MessageSquare, Trash2, Send, CheckSquare, Square, Repeat, Check, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import axios from 'axios';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface TaskModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (task: Omit<Task, 'id' | 'createdAt' | 'updated_at'> & { id?: string | number }) => void;
  onAutosave?: (updatedTask: Task) => void;
  task?: Task | null;
  defaultStatus?: Status;
  availableTags?: Tag[];
  activeBoardId?: number;
}

export default function TaskModal({
  open,
  onClose,
  onSave,
  onAutosave,
  task,
  defaultStatus = 'todo',
  availableTags = [],
  activeBoardId,
}: TaskModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [status, setStatus] = useState<Status>(defaultStatus);
  const [dueDate, setDueDate] = useState<string>('');
  const [recurrenceInterval, setRecurrenceInterval] = useState<RecurrenceInterval>('none');
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3B82F6');
  const [isTagPopoverOpen, setIsTagPopoverOpen] = useState(false);
  const [activities, setActivities] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoadingActivities, setIsLoadingActivities] = useState(false);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [autosaveStatus, setAutosaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const lastSavedPayloadRef = useRef<string>('');
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftKey = `taratask_modal_draft_${activeBoardId || 'default'}`;

  const buildPayload = () => ({
    title: title.trim(),
    description: description.trim() || null,
    subtasks,
    priority,
    status,
    due_date: dueDate || null,
    recurrence_interval: recurrenceInterval,
    tags: selectedTags.map((t) => t.id),
  });

  useEffect(() => {
    if (!open) {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
      setAutosaveStatus('idle');
      return;
    }

    if (task) {
      const initDue = task.due_date ? task.due_date.split('T')[0] : '';
      const initRecurrence = task.recurrence_interval || 'none';
      const initSubtasks = Array.isArray(task.subtasks) ? task.subtasks : [];
      const initTags = task.tags || [];

      setTitle(task.title);
      setDescription(task.description || '');
      setPriority(task.priority);
      setStatus(task.status);
      setDueDate(initDue);
      setRecurrenceInterval(initRecurrence);
      setSubtasks(initSubtasks);
      setSelectedTags(initTags);
      setAutosaveStatus('idle');

      lastSavedPayloadRef.current = JSON.stringify({
        title: task.title.trim(),
        description: (task.description || '').trim() || null,
        subtasks: initSubtasks,
        priority: task.priority,
        status: task.status,
        due_date: initDue || null,
        recurrence_interval: initRecurrence,
        tags: initTags.map((t) => t.id),
      });
    } else {
      let restored = false;
      if (typeof window !== 'undefined') {
        try {
          const raw = localStorage.getItem(draftKey);
          if (raw) {
            const parsed = JSON.parse(raw);
            setTitle(parsed.title || '');
            setDescription(parsed.description || '');
            setSubtasks(Array.isArray(parsed.subtasks) ? parsed.subtasks : []);
            restored = true;
          }
        } catch {
          // ignore invalid draft
        }
      }
      if (!restored) {
        setTitle('');
        setDescription('');
        setSubtasks([]);
      }
      setPriority('medium');
      setStatus(defaultStatus);
      setDueDate('');
      setRecurrenceInterval('none');
      setSelectedTags([]);
      lastSavedPayloadRef.current = '';
    }
    setNewSubtaskTitle('');
  }, [task?.id, defaultStatus, open]);

  // Autosave for existing tasks (debounced) & localStorage draft for new tasks
  useEffect(() => {
    if (!open) return;

    if (!task?.id) {
      if (typeof window !== 'undefined') {
        if (title.trim() || description.trim() || subtasks.length > 0) {
          localStorage.setItem(draftKey, JSON.stringify({ title, description, subtasks }));
        } else {
          localStorage.removeItem(draftKey);
        }
      }
      return;
    }

    if (!title.trim()) return;

    const currentPayload = buildPayload();
    const serialized = JSON.stringify(currentPayload);
    if (serialized === lastSavedPayloadRef.current) return;

    setAutosaveStatus('saving');
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);

    autosaveTimerRef.current = setTimeout(async () => {
      try {
        const res = await axios.put(`/tasks/${task.id}`, currentPayload, {
          headers: { Accept: 'application/json' },
        });
        lastSavedPayloadRef.current = serialized;
        setAutosaveStatus('saved');
        if (onAutosave && res.data) {
          onAutosave(res.data);
        }
      } catch (err) {
        console.error('Autosave failed:', err);
        setAutosaveStatus('error');
      }
    }, 650);

    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, [title, description, subtasks, priority, status, dueDate, recurrenceInterval, selectedTags, open, task?.id]);

  useEffect(() => {
    if (task?.id && open) {
      setIsLoadingActivities(true);
      setIsLoadingComments(true);

      Promise.all([
        axios.get(`/tasks/${task.id}/activities`),
        axios.get(`/tasks/${task.id}/comments`),
      ])
        .then(([activitiesRes, commentsRes]) => {
          setActivities(activitiesRes.data);
          setComments(commentsRes.data);
        })
        .catch((err) => console.error('Failed to fetch data', err))
        .finally(() => {
          setIsLoadingActivities(false);
          setIsLoadingComments(false);
        });
    }
  }, [task?.id, open]);

  const handleAddSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    const item: Subtask = {
      id: `st-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: newSubtaskTitle.trim(),
      completed: false,
    };
    setSubtasks([...subtasks, item]);
    setNewSubtaskTitle('');
  };

  const handleToggleSubtask = (id: string) => {
    setSubtasks(
      subtasks.map((st) => (st.id === id ? { ...st, completed: !st.completed } : st))
    );
  };

  const handleRemoveSubtask = (id: string) => {
    setSubtasks(subtasks.filter((st) => st.id !== id));
  };

  const handlePostComment = async () => {
    if (!newComment.trim() || !task?.id) return;

    try {
      const response = await axios.post(`/tasks/${task.id}/comments`, {
        content: newComment,
      });
      setComments([response.data, ...comments]);
      setNewComment('');
    } catch (error) {
      console.error('Failed to post comment', error);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    try {
      await axios.delete(`/comments/${commentId}`);
      setComments(comments.filter((c) => c.id !== commentId));
    } catch (error) {
      console.error('Failed to delete comment', error);
    }
  };

  const handleSave = () => {
    if (!title.trim()) return;

    if (!task?.id && typeof window !== 'undefined') {
      localStorage.removeItem(draftKey);
    }

    onSave({
      id: task?.id,
      title: title.trim(),
      description: description.trim(),
      subtasks,
      priority,
      status,
      due_date: dueDate || null,
      recurrence_interval: recurrenceInterval,
      tags: selectedTags,
    });

    handleClose();
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim() || !activeBoardId) return;

    try {
      await axios.post('/tags', {
        board_id: activeBoardId,
        name: newTagName,
        color: newTagColor,
      });
      window.location.reload();
    } catch (error) {
      console.error('Failed to create tag', error);
    }
  };

  const toggleTag = (tag: Tag) => {
    if (selectedTags.find((t) => t.id === tag.id)) {
      setSelectedTags(selectedTags.filter((t) => t.id !== tag.id));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleClose = () => {
    setTitle('');
    setDescription('');
    setPriority('medium');
    setStatus(defaultStatus);
    setRecurrenceInterval('none');
    setSubtasks([]);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] sm:max-w-[540px] max-h-[92dvh] p-4 sm:p-6 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-2xl shadow-[0_8px_32px_0_rgba(31,38,135,0.2)]">
        <DialogHeader>
          <div className="flex items-center justify-between pr-6">
            <DialogTitle className="text-2xl text-gray-800 dark:text-gray-100">
              {task ? 'Edit Task' : 'Add New Task'}
            </DialogTitle>
            {task && autosaveStatus !== 'idle' && (
              <span
                className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full transition-all ${
                  autosaveStatus === 'saving'
                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-300'
                    : autosaveStatus === 'saved'
                      ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300'
                      : 'bg-red-50 text-red-600 dark:bg-red-950/60 dark:text-red-300'
                }`}
              >
                {autosaveStatus === 'saving' && (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Saving...
                  </>
                )}
                {autosaveStatus === 'saved' && (
                  <>
                    <Check className="w-3 h-3" />
                    Autosaved
                  </>
                )}
                {autosaveStatus === 'error' && 'Save failed'}
              </span>
            )}
          </div>
          <DialogDescription className="text-gray-600 dark:text-gray-400">
            {task
              ? 'Changes are saved automatically as you edit.'
              : 'Create a new task for your board (draft is saved locally).'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto max-h-[70vh] pr-1">
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-4 bg-gray-100 dark:bg-slate-800 p-1">
              <TabsTrigger value="details" className="dark:data-[state=active]:bg-slate-700">
                Details
              </TabsTrigger>
              <TabsTrigger value="comments" className="dark:data-[state=active]:bg-slate-700">
                <MessageSquare className="w-4 h-4 mr-2" />
                Comments
              </TabsTrigger>
              <TabsTrigger value="activity" className="dark:data-[state=active]:bg-slate-700">
                Activity
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-gray-700 dark:text-gray-300 font-medium">
                  Title *
                </Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter task title"
                  className="border border-gray-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:border-blue-400 rounded-lg"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="description"
                  className="text-gray-700 dark:text-gray-300 font-medium"
                >
                  Description
                </Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter task description"
                  className="border border-gray-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:border-blue-400 min-h-[80px] rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="priority"
                    className="text-gray-700 dark:text-gray-300 font-medium"
                  >
                    Priority
                  </Label>
                  <Select value={priority} onValueChange={(value) => setPriority(value as Priority)}>
                    <SelectTrigger className="border border-gray-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:border-blue-400 rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                      <SelectItem value="low" className="dark:text-gray-300 dark:focus:bg-slate-700">
                        Low
                      </SelectItem>
                      <SelectItem
                        value="medium"
                        className="dark:text-gray-300 dark:focus:bg-slate-700"
                      >
                        Medium
                      </SelectItem>
                      <SelectItem
                        value="high"
                        className="dark:text-gray-300 dark:focus:bg-slate-700"
                      >
                        High
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status" className="text-gray-700 dark:text-gray-300 font-medium">
                    Status
                  </Label>
                  <Select value={status} onValueChange={(value) => setStatus(value as Status)}>
                    <SelectTrigger className="border border-gray-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:border-blue-400 rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                      <SelectItem value="todo" className="dark:text-gray-300 dark:focus:bg-slate-700">
                        To Do
                      </SelectItem>
                      <SelectItem
                        value="in-progress"
                        className="dark:text-gray-300 dark:focus:bg-slate-700"
                      >
                        In Progress
                      </SelectItem>
                      <SelectItem
                        value="in-review"
                        className="dark:text-gray-300 dark:focus:bg-slate-700"
                      >
                        In Review
                      </SelectItem>
                      <SelectItem value="done" className="dark:text-gray-300 dark:focus:bg-slate-700">
                        Done
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Due Date & Recurrence */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dueDate" className="text-gray-700 dark:text-gray-300 font-medium">
                    Due Date
                  </Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="border border-gray-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:border-blue-400 rounded-lg"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-700 dark:text-gray-300 font-medium flex items-center gap-1.5">
                    <Repeat className="w-3.5 h-3.5 text-purple-500" />
                    Recurring Cycle
                  </Label>
                  <Select
                    value={recurrenceInterval}
                    onValueChange={(value) => setRecurrenceInterval(value as RecurrenceInterval)}
                  >
                    <SelectTrigger className="border border-gray-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:border-blue-400 rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                      <SelectItem value="none" className="dark:text-gray-300 dark:focus:bg-slate-700">
                        One-time (None)
                      </SelectItem>
                      <SelectItem
                        value="monthly"
                        className="dark:text-gray-300 dark:focus:bg-slate-700"
                      >
                        Monthly
                      </SelectItem>
                      <SelectItem
                        value="quarterly"
                        className="dark:text-gray-300 dark:focus:bg-slate-700"
                      >
                        Quarterly (3 Months)
                      </SelectItem>
                      <SelectItem
                        value="yearly"
                        className="dark:text-gray-300 dark:focus:bg-slate-700"
                      >
                        Yearly (Annual)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Subtasks / Checklist Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-gray-700 dark:text-gray-300 font-medium flex items-center gap-1.5">
                    <CheckSquare className="w-4 h-4 text-blue-500" />
                    Subtasks / Checklist
                  </Label>
                  {subtasks.length > 0 && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {subtasks.filter((s) => s.completed).length}/{subtasks.length} completed
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  <Input
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    placeholder="Add a checklist item..."
                    className="border border-gray-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white text-sm h-9"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSubtask();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleAddSubtask}
                    className="h-9 px-3"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                {subtasks.length > 0 && (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pt-1">
                    {subtasks.map((st) => (
                      <div
                        key={st.id}
                        className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-gray-50 dark:bg-slate-800/70 border border-gray-100 dark:border-slate-700/60"
                      >
                        <button
                          type="button"
                          onClick={() => handleToggleSubtask(st.id)}
                          className="flex items-center gap-2 text-left flex-1 text-sm text-gray-700 dark:text-gray-200"
                        >
                          {st.completed ? (
                            <CheckSquare className="w-4 h-4 text-blue-500 shrink-0" />
                          ) : (
                            <Square className="w-4 h-4 text-gray-400 shrink-0" />
                          )}
                          <span className={st.completed ? 'line-through text-gray-400' : ''}>
                            {st.title}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveSubtask(st.id)}
                          className="text-gray-400 hover:text-red-500 p-1"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Tags Section */}
              <div className="space-y-2">
                <Label className="text-gray-700 dark:text-gray-300 font-medium">Tags</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {selectedTags.map((tag) => (
                    <Badge
                      key={tag.id}
                      style={{
                        backgroundColor: tag.color + '20',
                        color: tag.color,
                        borderColor: tag.color,
                      }}
                      className="border"
                    >
                      {tag.name}
                      <button
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className="ml-1 hover:text-red-500"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                  <Popover open={isTagPopoverOpen} onOpenChange={setIsTagPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-6 text-xs rounded-full border-dashed"
                      >
                        <Plus className="w-3 h-3 mr-1" /> Add Tag
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-3" align="start">
                      <div className="space-y-3">
                        <h4 className="font-medium text-xs text-muted-foreground">Select Tag</h4>
                        <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                          {availableTags.map((tag) => (
                            <Badge
                              key={tag.id}
                              variant="outline"
                              style={{
                                backgroundColor: selectedTags.find((t) => t.id === tag.id)
                                  ? tag.color
                                  : 'transparent',
                                color: selectedTags.find((t) => t.id === tag.id)
                                  ? '#fff'
                                  : tag.color,
                                borderColor: tag.color,
                                cursor: 'pointer',
                              }}
                              onClick={() => toggleTag(tag)}
                            >
                              {tag.name}
                            </Badge>
                          ))}
                        </div>
                        <div className="border-t pt-2">
                          <h4 className="font-medium text-xs text-muted-foreground mb-2">
                            Create New
                          </h4>
                          <div className="flex gap-2">
                            <Input
                              value={newTagName}
                              onChange={(e) => setNewTagName(e.target.value)}
                              placeholder="Tag name"
                              className="h-8 text-xs"
                            />
                            <Input
                              type="color"
                              value={newTagColor}
                              onChange={(e) => setNewTagColor(e.target.value)}
                              className="w-8 h-8 p-0 border-0"
                            />
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            className="w-full mt-2 h-7 text-xs"
                            onClick={handleCreateTag}
                          >
                            Create
                          </Button>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="comments" className="h-[350px] flex flex-col">
              <ScrollArea className="flex-1 pr-4 mb-4">
                {isLoadingComments ? (
                  <div className="flex justify-center p-4">
                    <span className="loader"></span>
                  </div>
                ) : comments.length === 0 ? (
                  <p className="text-center text-gray-500 text-sm py-8">No comments yet.</p>
                ) : (
                  <div className="space-y-4">
                    {comments.map((comment) => (
                      <div key={comment.id} className="flex gap-3 group">
                        <Avatar className="w-8 h-8">
                          <AvatarImage
                            src={
                              comment.user.avatar_path
                                ? `/storage/${comment.user.avatar_path}`
                                : undefined
                            }
                          />
                          <AvatarFallback>{comment.user.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold dark:text-gray-200">
                              {comment.user.name}
                            </span>
                            <span className="text-xs text-gray-400">
                              {new Date(comment.created_at).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 bg-gray-50 dark:bg-slate-800 p-2 rounded-lg">
                            {comment.body}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteComment(comment.id)}
                          className="opacity-0 group-hover:opacity-100 h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
              <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-white/10">
                <Textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Write a comment..."
                  className="min-h-[60px] resize-none border-gray-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handlePostComment();
                    }
                  }}
                />
                <Button
                  size="icon"
                  onClick={handlePostComment}
                  disabled={!newComment.trim()}
                  className="h-[60px] w-[60px]"
                >
                  <Send className="w-5 h-5" />
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="activity">
              <ScrollArea className="h-[300px] pr-4">
                {isLoadingActivities ? (
                  <div className="text-center text-gray-500 py-8">Loading...</div>
                ) : activities.length === 0 ? (
                  <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                    No activity yet
                  </div>
                ) : (
                  <div className="space-y-4">
                    {activities.map((activity) => (
                      <div key={activity.id} className="flex gap-3 text-sm">
                        <div className="min-w-[4px] w-1 bg-gray-200 dark:bg-slate-700 rounded-full" />
                        <div className="flex-1">
                          <p className="font-medium text-gray-800 dark:text-gray-200">
                            {activity.description}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(activity.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            className="border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 dark:text-gray-300 rounded-lg"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!title.trim()}
            className="bg-blue-500 hover:bg-blue-600 text-white border-0 rounded-lg"
          >
            {task ? 'Update' : 'Create'} Task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
