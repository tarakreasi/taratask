<?php

namespace App\Http\Controllers;

use App\Models\Board;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class BoardController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        return response()->json(Auth::user()->boards);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'theme_color' => 'nullable|string|max:7', // Hex color #RRGGBB
        ]);

        // Generate random color if not provided
        if (empty($validated['theme_color'])) {
            $validated['theme_color'] = '#' . str_pad(dechex(rand(0, 16777215)), 6, '0', STR_PAD_LEFT);
        }

        $board = Auth::user()->boards()->create($validated);

        if ($request->wantsJson()) {
            return response()->json($board);
        }

        return redirect()->back();
    }

    /**
     * Display the specified resource.
     */
    public function show(Board $board)
    {
        // Simple authorization
        if ($board->user_id !== Auth::id()) {
            abort(403);
        }

        return response()->json($board->load('tasks'));
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Board $board)
    {
        if ($board->user_id !== Auth::id()) {
            abort(403);
        }

        $validated = $request->validate([
            'title' => 'sometimes|string|max:255',
            'theme_color' => 'sometimes|string|max:7',
        ]);

        $board->update($validated);
        
        if ($request->wantsJson()) {
            return response()->json($board);
        }

        return redirect()->back();
    }

    /**
     * Show board settings page.
     */
    public function settings(Board $board)
    {
        if ($board->user_id !== Auth::id()) {
            abort(403);
        }

        return Inertia::render('BoardSettings', [
            'board' => $board,
        ]);
    }

    /**
     * Update board settings.
     */
    public function updateSettings(Request $request, Board $board)
    {
        if ($board->user_id !== Auth::id()) {
            abort(403);
        }

        $validated = $request->validate([
            'title' => 'sometimes|string|max:255',
            'description' => 'nullable|string|max:1000',
            'theme_color' => 'sometimes|string|max:7',
            'wip_limits' => 'nullable|array',
        ]);

        $board->update($validated);

        return redirect()->route('boards.settings', $board)
            ->with('success', 'Board settings updated successfully!');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Board $board)
    {
        if ($board->user_id !== Auth::id()) {
            abort(403);
        }

        $board->delete();

        return redirect()->route('home');
    }
}
