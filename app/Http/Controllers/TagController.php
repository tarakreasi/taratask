<?php

namespace App\Http\Controllers;

use App\Models\Board;
use App\Models\Tag;
use Illuminate\Http\Request;
use Inertia\Inertia;

class TagController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'board_id' => 'required|exists:boards,id',
            'name' => 'required|string|max:255',
            'color' => 'required|string|max:7',
        ]);

        $board = Board::findOrFail($validated['board_id']);
        if ($board->user_id !== $request->user()->id) {
            abort(403);
        }

        $tag = Tag::create($validated);

        return back();
    }

    public function destroy(Request $request, Tag $tag)
    {
        if ($tag->board && $tag->board->user_id !== $request->user()->id) {
            abort(403);
        }

        $tag->delete();
        
        if ($request->wantsJson()) {
            return response()->noContent();
        }
        
        return back();
    }
}
