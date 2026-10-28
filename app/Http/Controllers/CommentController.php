<?php

namespace App\Http\Controllers;

use App\Models\Comment;
use App\Models\Task;
use Illuminate\Http\Request;

class CommentController extends Controller
{
    public function index(Request $request, Task $task)
    {
        if ($task->board && $task->board->user_id !== $request->user()->id) {
            abort(403);
        }

        return $task->comments()->with('user')->get();
    }

    public function store(Request $request, Task $task)
    {
        if ($task->board && $task->board->user_id !== $request->user()->id) {
            abort(403);
        }

        $validated = $request->validate([
            'content' => 'required|string',
        ]);

        $comment = $task->comments()->create([
            'user_id' => $request->user()->id,
            'content' => $validated['content'],
        ]);

        return $comment->load('user');
    }

    public function destroy(Comment $comment)
    {
        // Ensure user owns the comment
        if ($comment->user_id !== auth()->id()) {
            abort(403);
        }

        $comment->delete();

        return response()->noContent();
    }
}
