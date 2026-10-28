<?php

namespace Tests\Feature;

use App\Models\Board;
use App\Models\Tag;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class Phase2And3FeaturesTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;
    protected Board $board;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
        $this->board = Board::factory()->create([
            'user_id' => $this->user->id,
            'title' => 'Operations & Subscriptions',
        ]);
    }

    #[Test]
    public function user_can_create_task_with_subtasks_and_recurrence(): void
    {
        $subtasks = [
            ['id' => 'st-1', 'title' => 'Check invoice', 'completed' => true],
            ['id' => 'st-2', 'title' => 'Pay renewal', 'completed' => false],
        ];

        $response = $this->actingAs($this->user)->postJson('/tasks', [
            'title' => 'Renew VPS Tencent Cloud',
            'description' => 'Lighthouse Singapore ins-p08cohnu',
            'priority' => 'high',
            'status' => 'todo',
            'board_id' => $this->board->id,
            'due_date' => '2027-04-23',
            'recurrence_interval' => 'yearly',
            'subtasks' => $subtasks,
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('tasks', [
            'title' => 'Renew VPS Tencent Cloud',
            'recurrence_interval' => 'yearly',
        ]);

        $task = Task::where('title', 'Renew VPS Tencent Cloud')->first();
        $this->assertCount(2, $task->subtasks);
        $this->assertTrue($task->subtasks[0]['completed']);
    }

    #[Test]
    public function completing_recurring_task_automatically_schedules_next_occurrence(): void
    {
        $tag = Tag::factory()->create(['board_id' => $this->board->id, 'name' => 'Infra']);

        $task = Task::factory()->create([
            'board_id' => $this->board->id,
            'title' => 'Perpanjang Domain tarakreasi.com',
            'status' => 'in-progress',
            'priority' => 'high',
            'due_date' => '2027-09-24',
            'recurrence_interval' => 'yearly',
            'subtasks' => [
                ['id' => 'st-1', 'title' => 'Login DomaiNesia', 'completed' => true],
            ],
        ]);
        $task->tags()->attach($tag->id);

        $response = $this->actingAs($this->user)->putJson("/tasks/{$task->id}", [
            'status' => 'done',
        ]);

        $response->assertStatus(200);

        $this->assertEquals(2, Task::where('board_id', $this->board->id)->count());

        $nextTask = Task::where('board_id', $this->board->id)
            ->where('id', '!=', $task->id)
            ->first();

        $this->assertNotNull($nextTask);
        $this->assertEquals('todo', $nextTask->status);
        $this->assertEquals('yearly', $nextTask->recurrence_interval);
        $this->assertEquals('2028-09-24', $nextTask->due_date->format('Y-m-d'));
        $this->assertFalse($nextTask->subtasks[0]['completed']);
        $this->assertCount(1, $nextTask->tags);
    }

    #[Test]
    public function user_can_archive_and_restore_single_task(): void
    {
        $task = Task::factory()->create([
            'board_id' => $this->board->id,
            'status' => 'done',
        ]);

        $this->actingAs($this->user)
            ->postJson("/tasks/{$task->id}/archive")
            ->assertStatus(200);

        $task->refresh();
        $this->assertNotNull($task->archived_at);

        // Restore
        $this->actingAs($this->user)
            ->postJson("/tasks/{$task->id}/archive")
            ->assertStatus(200);

        $task->refresh();
        $this->assertNull($task->archived_at);
    }

    #[Test]
    public function user_can_archive_all_done_tasks_on_board(): void
    {
        Task::factory()->count(2)->create([
            'board_id' => $this->board->id,
            'status' => 'done',
        ]);
        Task::factory()->create([
            'board_id' => $this->board->id,
            'status' => 'todo',
        ]);

        $response = $this->actingAs($this->user)
            ->postJson("/boards/{$this->board->id}/archive-done");

        $response->assertStatus(200)->assertJson(['archived_count' => 2]);
        $this->assertEquals(2, $this->board->tasks()->whereNotNull('archived_at')->count());
        $this->assertEquals(1, $this->board->tasks()->whereNull('archived_at')->count());
    }

    #[Test]
    public function user_can_search_tasks_across_boards(): void
    {
        $board2 = Board::factory()->create(['user_id' => $this->user->id, 'title' => 'Second Board']);
        Task::factory()->create(['board_id' => $this->board->id, 'title' => 'Alpha Server Audit']);
        Task::factory()->create(['board_id' => $board2->id, 'title' => 'Alpha Kiosk Client']);

        $response = $this->actingAs($this->user)->getJson('/search/tasks?q=Alpha');

        $response->assertStatus(200)->assertJsonCount(2);
    }

    #[Test]
    public function user_can_export_tasks_as_json_and_csv(): void
    {
        Task::factory()->create([
            'board_id' => $this->board->id,
            'title' => 'Exportable Task',
            'status' => 'todo',
        ]);

        $jsonRes = $this->actingAs($this->user)->get('/export/tasks?format=json');
        $jsonRes->assertStatus(200)->assertJsonFragment(['title' => 'Exportable Task']);

        $csvRes = $this->actingAs($this->user)->get('/export/tasks?format=csv');
        $csvRes->assertStatus(200);
        $this->assertStringContainsString('text/csv', $csvRes->headers->get('Content-Type'));
    }

    #[Test]
    public function user_can_open_quick_capture_page(): void
    {
        $response = $this->actingAs($this->user)->get('/capture');

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) =>
            $page->component('QuickCapture')
                ->has('boards')
                ->has('recentTasks')
        );
    }

    #[Test]
    public function rapid_autosave_updates_coalesce_activity_logs_and_return_json(): void
    {
        $task = Task::factory()->create([
            'board_id' => $this->board->id,
            'title' => 'Initial Draft',
            'description' => 'Step 1',
            'status' => 'todo',
            'priority' => 'medium',
        ]);

        // Simulate 3 rapid autosave requests within 5 minutes
        $this->actingAs($this->user)
            ->putJson("/tasks/{$task->id}", [
                'title' => 'Initial Draft v2',
                'description' => 'Step 1 updated',
            ])
            ->assertOk()
            ->assertJsonPath('title', 'Initial Draft v2');

        $this->actingAs($this->user)
            ->putJson("/tasks/{$task->id}", [
                'title' => 'Initial Draft v3',
                'description' => 'Step 1 + Step 2',
                'subtasks' => [
                    ['id' => 'st-1', 'title' => 'Subtask A', 'completed' => true],
                ],
            ])
            ->assertOk()
            ->assertJsonPath('title', 'Initial Draft v3')
            ->assertJsonPath('subtasks.0.completed', true);

        $this->actingAs($this->user)
            ->putJson("/tasks/{$task->id}", [
                'title' => 'Final Autosaved Title',
                'priority' => 'high',
            ])
            ->assertOk()
            ->assertJsonPath('title', 'Final Autosaved Title')
            ->assertJsonPath('priority', 'high');

        // Ensure all 3 rapid autosaves coalesced into a single 'updated' activity entry
        $updatedActivities = $task->activities()->where('type', 'updated')->get();
        $this->assertCount(1, $updatedActivities);
        $this->assertEquals('Final Autosaved Title', $updatedActivities->first()->properties['title']);
        $this->assertEquals('high', $updatedActivities->first()->properties['priority']);
    }
}

