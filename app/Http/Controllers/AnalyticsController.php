<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Task;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;

class AnalyticsController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $requestedBoardId = $request->query('board_id');
        if ($requestedBoardId) {
            $board = $user->boards()->find($requestedBoardId);
            if (!$board) {
                abort(403);
            }
            $boardId = $board->id;
        } else {
            $boardId = $user->boards()->first()?->id;
        }
        
        // Cycle Time Calculation (Average time from in-progress to done in days)
        $tasksWithTimestamps = Task::where('board_id', $boardId)
            ->whereNotNull('started_at')
            ->whereNotNull('completed_at')
            ->where('status', 'done')
            ->get();
            
        $totalDays = 0;
        $cycleTimeCount = $tasksWithTimestamps->count();
        
        foreach ($tasksWithTimestamps as $task) {
            $start = \Carbon\Carbon::parse($task->started_at);
            $end = \Carbon\Carbon::parse($task->completed_at);
            // Ensure we always get positive duration
            if ($end->greaterThan($start)) {
                $totalDays += $start->diffInDays($end);
            }
        }
        
        $avgCycleTime = $cycleTimeCount > 0 ? round($totalDays / $cycleTimeCount, 1) : 0;
        
        // Completed Count (All tasks marked as done)
        $completedCount = Task::where('board_id', $boardId)
            ->where('status', 'done')
            ->count();
        
        // Throughput (Tasks completed in last 7 days)
        $throughput = Task::where('board_id', $boardId)
            ->where('status', 'done')
            ->where('completed_at', '>=', now()->subDays(7))
            ->count();
            
        // WIP Count (Tasks in progress or in review)
        $wipCount = Task::where('board_id', $boardId)
            ->whereIn('status', ['in-progress', 'in-review'])
            ->count();

        return response()->json([
            'avgCycleTime' => $avgCycleTime,
            'throughput' => $throughput,
            'wipCount' => $wipCount,
            'completedCount' => $completedCount
        ]);
    }
}
