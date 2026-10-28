<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Board;
use App\Models\Task;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;
use Carbon\Carbon;

class AnalyticsTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;
    protected Board $board;

    protected function setUp(): void
    {
        parent::setUp();
        
        $this->user = User::factory()->create();
        $this->board = Board::factory()->create(['user_id' => $this->user->id]);
    }

    #[Test]
    public function analytics_endpoint_returns_metrics()
    {
        $response = $this->actingAs($this->user)
            ->get('/analytics?board_id=' . $this->board->id);

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'avgCycleTime',
            'throughput',
            'wipCount',
            'completedCount',
        ]);
    }

    #[Test]
    public function analytics_calculates_average_cycle_time()
    {
        // Create tasks with known cycle times
        $task1 = Task::factory()->create([
            'board_id' => $this->board->id,
            'status' => 'done',
            'started_at' => Carbon::now()->subDays(5),
            'completed_at' => Carbon::now()->subDays(2), // 3 days cycle time
        ]);

        $task2 = Task::factory()->create([
            'board_id' => $this->board->id,
            'status' => 'done',
            'started_at' => Carbon::now()->subDays(7),
            'completed_at' => Carbon::now()->subDays(2), // 5 days cycle time
        ]);

        $response = $this->actingAs($this->user)
            ->get('/analytics?board_id=' . $this->board->id);

        $response->assertStatus(200);
        
        $avgCycleTime = $response->json('avgCycleTime');
        $this->assertEqualsWithDelta(4.0, $avgCycleTime, 0.5); // Average of 3 and 5 days
    }

    #[Test]
    public function analytics_counts_work_in_progress()
    {
        Task::factory()->count(3)->create([
            'board_id' => $this->board->id,
            'status' => 'in-progress',
        ]);

        Task::factory()->count(2)->create([
            'board_id' => $this->board->id,
            'status' => 'in-review',
        ]);

        Task::factory()->create([
            'board_id' => $this->board->id,
            'status' => 'done',
        ]);

        $response = $this->actingAs($this->user)
            ->get('/analytics?board_id=' . $this->board->id);

        $response->assertStatus(200);
        $this->assertEquals(5, $response->json('wipCount')); // 3 + 2
    }

    #[Test]
    public function analytics_counts_completed_tasks()
    {
        Task::factory()->count(7)->create([
            'board_id' => $this->board->id,
            'status' => 'done',
        ]);

        Task::factory()->count(3)->create([
            'board_id' => $this->board->id,
            'status' => 'todo',
        ]);

        $response = $this->actingAs($this->user)
            ->get('/analytics?board_id=' . $this->board->id);

        $response->assertStatus(200);
        $this->assertEquals(7, $response->json('completedCount'));
    }

    #[Test]
    public function analytics_calculates_throughput_for_last_7_days()
    {
        // Tasks completed in the last 7 days
        Task::factory()->count(5)->create([
            'board_id' => $this->board->id,
            'status' => 'done',
            'completed_at' => Carbon::now()->subDays(3),
        ]);

        // Tasks completed more than 7 days ago (should not count)
        Task::factory()->count(2)->create([
            'board_id' => $this->board->id,
            'status' => 'done',
            'completed_at' => Carbon::now()->subDays(10),
        ]);

        $response = $this->actingAs($this->user)
            ->get('/analytics?board_id=' . $this->board->id);

        $response->assertStatus(200);
        $this->assertEquals(5, $response->json('throughput'));
    }

    #[Test]
    public function analytics_are_scoped_to_board()
    {
        $board2 = Board::factory()->create(['user_id' => $this->user->id]);

        // Create tasks for board 1
        Task::factory()->count(3)->create([
            'board_id' => $this->board->id,
            'status' => 'done',
        ]);

        // Create tasks for board 2
        Task::factory()->count(5)->create([
            'board_id' => $board2->id,
            'status' => 'done',
        ]);

        $response = $this->actingAs($this->user)
            ->get('/analytics?board_id=' . $this->board->id);

        $response->assertStatus(200);
        $this->assertEquals(3, $response->json('completedCount'));
    }

    #[Test]
    public function analytics_handles_boards_with_no_tasks()
    {
        $response = $this->actingAs($this->user)
            ->get('/analytics?board_id=' . $this->board->id);

        $response->assertStatus(200);
        $this->assertEquals(0, $response->json('avgCycleTime'));
        $this->assertEquals(0, $response->json('throughput'));
        $this->assertEquals(0, $response->json('wipCount'));
        $this->assertEquals(0, $response->json('completedCount'));
    }
}
