<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Board;
use App\Models\Task;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class TaskManagementTest extends TestCase
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
    public function user_can_view_kanban_board_when_authenticated()
    {
        $response = $this->actingAs($this->user)
            ->get('/');

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page->component('Kanban'));
    }

    #[Test]
    public function guest_is_redirected_to_login()
    {
        $response = $this->get('/');

        $response->assertRedirect('/login');
    }

    #[Test]
    public function user_can_create_a_task()
    {
        $taskData = [
            'title' => 'Test Task',
            'description' => 'This is a test task',
            'priority' => 'high',
            'status' => 'todo',
            'board_id' => $this->board->id,
        ];

        $response = $this->actingAs($this->user)
            ->post('/tasks', $taskData);

        $response->assertRedirect();
        $this->assertDatabaseHas('tasks', [
            'title' => 'Test Task',
            'board_id' => $this->board->id,
        ]);

        // Verify activity was logged
        $task = Task::where('title', 'Test Task')->first();
        $this->assertDatabaseHas('activities', [
            'task_id' => $task->id,
            'type' => 'created',
        ]);
    }

    #[Test]
    public function user_can_update_a_task()
    {
        $task = Task::factory()->create([
            'board_id' => $this->board->id,
            'title' => 'Original Title',
            'status' => 'todo',
        ]);

        $response = $this->actingAs($this->user)
            ->put("/tasks/{$task->id}", [
                'title' => 'Updated Title',
                'priority' => 'medium',
            ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('tasks', [
            'id' => $task->id,
            'title' => 'Updated Title',
        ]);
    }

    #[Test]
    public function user_can_move_task_between_columns()
    {
        $task = Task::factory()->create([
            'board_id' => $this->board->id,
            'status' => 'todo',
        ]);

        $response = $this->actingAs($this->user)
            ->put("/tasks/{$task->id}", [
                'status' => 'in-progress',
            ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('tasks', [
            'id' => $task->id,
            'status' => 'in-progress',
        ]);

        // Verify move activity was logged
        $this->assertDatabaseHas('activities', [
            'task_id' => $task->id,
            'type' => 'moved',
        ]);
    }

    #[Test]
    public function moving_task_to_in_progress_sets_started_at()
    {
        $task = Task::factory()->create([
            'board_id' => $this->board->id,
            'status' => 'todo',
            'started_at' => null,
        ]);

        $this->actingAs($this->user)
            ->put("/tasks/{$task->id}", [
                'status' => 'in-progress',
            ]);

        $task->refresh();
        $this->assertNotNull($task->started_at);
    }

    #[Test]
    public function moving_task_to_done_sets_completed_at()
    {
        $task = Task::factory()->create([
            'board_id' => $this->board->id,
            'status' => 'in-progress',
            'completed_at' => null,
        ]);

        $this->actingAs($this->user)
            ->put("/tasks/{$task->id}", [
                'status' => 'done',
            ]);

        $task->refresh();
        $this->assertNotNull($task->completed_at);
    }

    #[Test]
    public function user_can_delete_a_task()
    {
        $task = Task::factory()->create([
            'board_id' => $this->board->id,
        ]);

        $response = $this->actingAs($this->user)
            ->delete("/tasks/{$task->id}");

        $response->assertStatus(302);
        $this->assertDatabaseMissing('tasks', [
            'id' => $task->id,
        ]);
    }

    #[Test]
    public function user_can_view_task_activities()
    {
        $task = Task::factory()->create([
            'board_id' => $this->board->id,
        ]);

        // Create some activities
        $task->activities()->create([
            'type' => 'created',
            'description' => 'Task created',
            'properties' => [],
        ]);

        $task->activities()->create([
            'type' => 'updated',
            'description' => 'Task updated',
            'properties' => [],
        ]);

        $response = $this->actingAs($this->user)
            ->get("/tasks/{$task->id}/activities");

        $response->assertStatus(200);
        $response->assertJsonCount(2);
    }

    #[Test]
    public function task_requires_title()
    {
        $response = $this->actingAs($this->user)
            ->post('/tasks', [
                'description' => 'Test description',
                'priority' => 'low',
                'status' => 'todo',
                'board_id' => $this->board->id,
            ]);

        $response->assertSessionHasErrors('title');
    }

    #[Test]
    public function task_requires_valid_priority()
    {
        $response = $this->actingAs($this->user)
            ->post('/tasks', [
                'title' => 'Test Task',
                'priority' => 'invalid-priority',
                'status' => 'todo',
                'board_id' => $this->board->id,
            ]);

        $response->assertSessionHasErrors('priority');
    }

    #[Test]
    public function task_requires_valid_status()
    {
        $response = $this->actingAs($this->user)
            ->post('/tasks', [
                'title' => 'Test Task',
                'priority' => 'low',
                'status' => 'invalid-status',
                'board_id' => $this->board->id,
            ]);

        $response->assertSessionHasErrors('status');
    }

    #[Test]
    public function default_board_is_created_for_user_if_none_exists()
    {
        $newUser = User::factory()->create();
        
        $this->assertEquals(0, $newUser->boards()->count());

        $response = $this->actingAs($newUser)->get('/');

        $response->assertStatus(200);
        $this->assertEquals(1, $newUser->fresh()->boards()->count());
        $this->assertEquals('Personal', $newUser->boards()->first()->title);
    }
}
