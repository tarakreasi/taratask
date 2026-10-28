<?php

namespace App\Http\Controllers;

use App\Models\Board;
use App\Models\Task;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;

class TaskController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $user = $request->user();

        // Ensure user has at least one board
        if ($user->boards()->count() === 0) {
            $user->boards()->create([
                'title' => 'Personal',
                'theme_color' => '#4A90E2',
            ]);
        }

        $activeBoard = null;
        if ($request->has('board_id')) {
            $activeBoard = $user->boards()->find($request->board_id);
        }

        // Fallback to first board if specific one not found or not provided
        if (!$activeBoard) {
            $activeBoard = $user->boards()->first();
        }

        $showArchived = $request->boolean('show_archived');

        $tasksQuery = $activeBoard
            ? $activeBoard->tasks()->with(['tags', 'comments'])->orderBy('created_at', 'desc')
            : null;

        if ($tasksQuery && !$showArchived) {
            $tasksQuery->whereNull('archived_at');
        }

        $tasks = $tasksQuery ? $tasksQuery->get() : [];
        $archivedCount = $activeBoard
            ? $activeBoard->tasks()->whereNotNull('archived_at')->count()
            : 0;

        return Inertia::render('Kanban', [
            'tasks' => $tasks,
            'boards' => $user->boards,
            'activeBoard' => $activeBoard,
            'tags' => $activeBoard ? $activeBoard->tags : [],
            'archivedCount' => $archivedCount,
            'showArchived' => $showArchived,
        ]);
    }

    /**
     * Mobile-first Quick Capture / Braindump page (/capture).
     */
    public function quickCapture(Request $request)
    {
        $user = $request->user();

        if ($user->boards()->count() === 0) {
            $user->boards()->create([
                'title' => 'Personal',
                'theme_color' => '#4A90E2',
            ]);
        }

        $boards = $user->boards()->get();
        $recentTasks = Task::whereIn('board_id', $boards->pluck('id'))
            ->whereNull('archived_at')
            ->with('board:id,title,theme_color')
            ->latest()
            ->limit(6)
            ->get();

        return Inertia::render('QuickCapture', [
            'boards' => $boards,
            'recentTasks' => $recentTasks,
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'subtasks' => 'nullable|array',
            'subtasks.*.id' => 'required_with:subtasks|string',
            'subtasks.*.title' => 'required_with:subtasks|string|max:255',
            'subtasks.*.completed' => 'required_with:subtasks|boolean',
            'priority' => 'required|in:low,medium,high',
            'status' => 'required|in:todo,in-progress,in-review,done',
            'board_id' => 'nullable|exists:boards,id',
            'due_date' => 'nullable|date',
            'recurrence_interval' => 'nullable|in:none,monthly,quarterly,yearly',
            'tags' => 'nullable|array',
            'tags.*' => 'exists:tags,id',
        ]);

        if (empty($validated['recurrence_interval'])) {
            $validated['recurrence_interval'] = 'none';
        }

        // If board_id not provided, use user's first board
        if (empty($validated['board_id'])) {
            $board = $request->user()->boards()->first();
            if (!$board) {
                $board = $request->user()->boards()->create([
                    'title' => 'Personal',
                    'theme_color' => '#4A90E2',
                ]);
            }
            $validated['board_id'] = $board->id;
        } else {
            // Verify board ownership
            $board = Board::find($validated['board_id']);
            if ($board->user_id !== $request->user()->id) {
                abort(403);
            }
        }

        $tagIds = $validated['tags'] ?? null;
        unset($validated['tags']);

        if ($validated['status'] === 'in-progress') {
            $validated['started_at'] = now();
        } elseif ($validated['status'] === 'done') {
            $validated['completed_at'] = now();
        }

        $task = $board->tasks()->create($validated);

        if (is_array($tagIds)) {
            $task->tags()->sync($tagIds);
        }

        $task->activities()->create([
            'type' => 'created',
            'description' => 'Task created',
            'properties' => $validated,
        ]);

        if ($request->wantsJson()) {
            return response()->json($task->load(['tags', 'comments']), 201);
        }

        return redirect()->back();
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Task $task)
    {
        $validated = $request->validate([
            'title' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'subtasks' => 'nullable|array',
            'subtasks.*.id' => 'required_with:subtasks|string',
            'subtasks.*.title' => 'required_with:subtasks|string|max:255',
            'subtasks.*.completed' => 'required_with:subtasks|boolean',
            'priority' => 'sometimes|in:low,medium,high',
            'status' => 'sometimes|in:todo,in-progress,in-review,done',
            'due_date' => 'nullable|date',
            'recurrence_interval' => 'nullable|in:none,monthly,quarterly,yearly',
            'tags' => 'nullable|array',
            'tags.*' => 'exists:tags,id',
        ]);

        $tagIds = null;
        if (array_key_exists('tags', $validated)) {
            $tagIds = $validated['tags'] ?? [];
            unset($validated['tags']);
        }

        $oldStatus = $task->status;
        $task->fill($validated);

        $changes = $task->getDirty();
        $task->save();

        if (is_array($tagIds)) {
            $task->tags()->sync($tagIds);
        }

        if (isset($validated['status']) && $oldStatus !== $validated['status']) {
            $task->activities()->create([
                'type' => 'moved',
                'description' => "Moved from {$oldStatus} to {$validated['status']}",
                'properties' => ['from' => $oldStatus, 'to' => $validated['status']],
            ]);

            // Cycle Time Logic
            if ($validated['status'] === 'in-progress' && !$task->started_at) {
                $task->started_at = now();
                $task->save();
            }
            if ($validated['status'] === 'done' && !$task->completed_at) {
                $task->completed_at = now();
                $task->save();
            }

            // Recurring Task Auto-Renewal when moved to 'done'
            if ($validated['status'] === 'done' && $task->recurrence_interval && $task->recurrence_interval !== 'none') {
                $baseDate = $task->due_date ? Carbon::parse($task->due_date) : now();
                $nextDueDate = match ($task->recurrence_interval) {
                    'monthly' => $baseDate->copy()->addMonth(),
                    'quarterly' => $baseDate->copy()->addMonths(3),
                    'yearly' => $baseDate->copy()->addYear(),
                    default => null,
                };

                if ($nextDueDate) {
                    $resetSubtasks = is_array($task->subtasks)
                        ? array_map(fn ($st) => array_merge($st, ['completed' => false]), $task->subtasks)
                        : null;

                    $nextTask = Task::create([
                        'title' => $task->title,
                        'description' => $task->description,
                        'subtasks' => $resetSubtasks,
                        'priority' => $task->priority,
                        'status' => 'todo',
                        'board_id' => $task->board_id,
                        'due_date' => $nextDueDate,
                        'recurrence_interval' => $task->recurrence_interval,
                    ]);

                    if ($task->tags()->count() > 0) {
                        $nextTask->tags()->sync($task->tags()->pluck('tags.id')->toArray());
                    }

                    $nextTask->activities()->create([
                        'type' => 'created',
                        'description' => "Auto-scheduled recurring ({$task->recurrence_interval}) task",
                        'properties' => ['previous_task_id' => $task->id, 'due_date' => $nextDueDate->toDateString()],
                    ]);
                }
            }
        } elseif (!empty($changes)) {
            $description = 'Task updated';

            if (isset($changes['title'])) {
                $description = 'Updated title';
            } elseif (isset($changes['priority'])) {
                $description = "Changed priority to {$changes['priority']}";
            } elseif (isset($changes['description'])) {
                $description = 'Updated description';
            } elseif (isset($changes['subtasks'])) {
                $description = 'Updated subtasks checklist';
            }

            $task->activities()->create([
                'type' => 'updated',
                'description' => $description,
                'properties' => $changes,
            ]);
        }

        if ($request->wantsJson()) {
            return response()->json($task->load(['tags', 'comments']));
        }

        return redirect()->back();
    }

    /**
     * Toggle archive state on a single task.
     */
    public function archive(Request $request, Task $task)
    {
        if ($task->board->user_id !== $request->user()->id) {
            abort(403);
        }

        $isArchiving = is_null($task->archived_at);
        $task->archived_at = $isArchiving ? now() : null;
        $task->save();

        $task->activities()->create([
            'type' => $isArchiving ? 'archived' : 'restored',
            'description' => $isArchiving ? 'Task archived' : 'Task restored from archive',
            'properties' => ['archived_at' => $task->archived_at],
        ]);

        if ($request->wantsJson()) {
            return response()->json($task);
        }

        return redirect()->back();
    }

    /**
     * Archive all completed ('done') tasks on a board.
     */
    public function archiveDone(Request $request, Board $board)
    {
        if ($board->user_id !== $request->user()->id) {
            abort(403);
        }

        $count = $board->tasks()
            ->where('status', 'done')
            ->whereNull('archived_at')
            ->update(['archived_at' => now()]);

        if ($request->wantsJson()) {
            return response()->json(['archived_count' => $count]);
        }

        return redirect()->back();
    }

    /**
     * Server-side cross-board task search for Command Palette (Ctrl+K).
     */
    public function search(Request $request)
    {
        $query = trim((string) $request->query('q', ''));
        $boardIds = $request->user()->boards()->pluck('id');

        $tasksQuery = Task::whereIn('board_id', $boardIds)
            ->with(['board:id,title,theme_color', 'tags:id,name,color'])
            ->orderBy('updated_at', 'desc')
            ->limit(25);

        if ($query !== '') {
            $tasksQuery->where(function ($q) use ($query) {
                $q->where('title', 'like', "%{$query}%")
                    ->orWhere('description', 'like', "%{$query}%")
                    ->orWhereHas('tags', function ($tq) use ($query) {
                        $tq->where('name', 'like', "%{$query}%");
                    });
            });
        }

        return response()->json($tasksQuery->get());
    }

    /**
     * Export tasks in JSON or CSV format.
     */
    public function export(Request $request)
    {
        $user = $request->user();
        $format = strtolower((string) $request->query('format', 'json'));
        $boardId = $request->query('board_id');

        $boardIds = $boardId
            ? $user->boards()->where('id', $boardId)->pluck('id')
            : $user->boards()->pluck('id');

        $tasks = Task::whereIn('board_id', $boardIds)
            ->with(['board:id,title', 'tags:id,name'])
            ->orderBy('board_id')
            ->orderBy('created_at', 'desc')
            ->get();

        if ($format === 'csv') {
            $headers = [
                'Content-Type' => 'text/csv; charset=UTF-8',
                'Content-Disposition' => 'attachment; filename="taratask-export-' . now()->format('Y-m-d') . '.csv"',
            ];

            $callback = function () use ($tasks) {
                $out = fopen('php://output', 'w');
                fputcsv($out, [
                    'ID',
                    'Board',
                    'Title',
                    'Description',
                    'Status',
                    'Priority',
                    'Due Date',
                    'Recurrence',
                    'Subtasks Progress',
                    'Tags',
                    'Archived',
                    'Created At',
                    'Completed At',
                ]);

                foreach ($tasks as $task) {
                    $subtasksTotal = is_array($task->subtasks) ? count($task->subtasks) : 0;
                    $subtasksDone = is_array($task->subtasks)
                        ? count(array_filter($task->subtasks, fn ($st) => !empty($st['completed'])))
                        : 0;

                    fputcsv($out, [
                        $task->id,
                        $task->board?->title ?? '',
                        $task->title,
                        $task->description ?? '',
                        $task->status,
                        $task->priority,
                        $task->due_date ? $task->due_date->format('Y-m-d') : '',
                        $task->recurrence_interval ?? 'none',
                        $subtasksTotal > 0 ? "{$subtasksDone}/{$subtasksTotal}" : '',
                        $task->tags->pluck('name')->implode(', '),
                        $task->archived_at ? 'Yes' : 'No',
                        $task->created_at?->toIso8601String() ?? '',
                        $task->completed_at?->toIso8601String() ?? '',
                    ]);
                }

                fclose($out);
            };

            return response()->stream($callback, 200, $headers);
        }

        $filename = 'taratask-export-' . now()->format('Y-m-d') . '.json';
        return response()->json([
            'exported_at' => now()->toIso8601String(),
            'total_tasks' => $tasks->count(),
            'tasks' => $tasks,
        ], 200, [
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }

    public function activities(Task $task)
    {
        return response()->json($task->activities()->latest()->get());
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Request $request, Task $task)
    {
        $task->delete();
        if ($request->wantsJson()) {
            return response()->noContent();
        }

        return redirect()->back();
    }
}
