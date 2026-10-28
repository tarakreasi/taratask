<?php

namespace App\Http\Controllers;

use App\Models\Task;
use Illuminate\Http\Request;
use Inertia\Inertia;

class MyTasksController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        
        // Get all user's boards
        $boards = $user->boards()->get();
        
        // Build query
        $query = Task::whereIn('board_id', $boards->pluck('id'))
            ->with(['board', 'tags', 'comments']);
        
        // Apply filters
        if ($request->has('board_id') && $request->board_id) {
            $query->where('board_id', $request->board_id);
        }
        
        if ($request->has('status') && $request->status) {
            $query->where('status', $request->status);
        }
        
        if ($request->has('priority') && $request->priority) {
            $query->where('priority', $request->priority);
        }
        
        if ($request->has('tag_id') && $request->tag_id) {
            $query->whereHas('tags', function ($q) use ($request) {
                $q->where('tags.id', $request->tag_id);
            });
        }
        
        // Apply sorting (whitelisted to prevent SQL injection)
        $allowedSorts = ['created_at', 'due_date', 'priority', 'title', 'status', 'updated_at'];
        $requestedSort = (string) $request->get('sort_by', 'created_at');
        $sortBy = in_array($requestedSort, $allowedSorts, true) ? $requestedSort : 'created_at';
        $sortOrder = strtolower((string) $request->get('sort_order', 'desc')) === 'asc' ? 'asc' : 'desc';
        
        switch ($sortBy) {
            case 'due_date':
                $query->orderByRaw('due_date IS NULL, due_date ' . $sortOrder);
                break;
            case 'priority':
                $query->orderByRaw("CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 ELSE 4 END " . $sortOrder);
                break;
            case 'title':
                $query->orderBy('title', $sortOrder);
                break;
            default:
                $query->orderBy($sortBy, $sortOrder);
        }
        
        // Paginate
        $tasks = $query->paginate(20);
        
        // Get all tags for filter
        $allTags = \App\Models\Tag::whereIn('board_id', $boards->pluck('id'))
            ->get();
        
        return Inertia::render('MyTasks', [
            'tasks' => $tasks,
            'boards' => $boards,
            'allTags' => $allTags,
            'filters' => [
                'board_id' => $request->board_id,
                'status' => $request->status,
                'priority' => $request->priority,
                'tag_id' => $request->tag_id,
                'sort_by' => $sortBy,
                'sort_order' => $sortOrder,
            ],
        ]);
    }
}
