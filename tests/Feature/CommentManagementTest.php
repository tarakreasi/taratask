<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Board;
use App\Models\Task;
use App\Models\Comment;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class CommentManagementTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;
    protected Board $board;
    protected Task $task;

    protected function setUp(): void
    {
        parent::setUp();
        
        $this->user = User::factory()->create();
        $this->board = Board::factory()->create(['user_id' => $this->user->id]);
        $this->task = Task::factory()->create(['board_id' => $this->board->id]);
    }

    #[Test]
    public function user_can_view_task_comments()
    {
        Comment::factory()->count(3)->create([
            'task_id' => $this->task->id,
            'user_id' => $this->user->id,
        ]);

        $response = $this->actingAs($this->user)
            ->get("/tasks/{$this->task->id}/comments");

        $response->assertStatus(200);
        $response->assertJsonCount(3);
    }

    #[Test]
    public function user_can_create_comment_on_task()
    {
        $response = $this->actingAs($this->user)
            ->post("/tasks/{$this->task->id}/comments", [
                'content' => 'This is a test comment',
            ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('comments', [
            'task_id' => $this->task->id,
            'user_id' => $this->user->id,
            'content' => 'This is a test comment',
        ]);
    }

    #[Test]
    public function user_can_delete_their_own_comment()
    {
        $comment = Comment::factory()->create([
            'task_id' => $this->task->id,
            'user_id' => $this->user->id,
        ]);

        $response = $this->actingAs($this->user)
            ->delete("/comments/{$comment->id}");

        $response->assertStatus(204);
        $this->assertDatabaseMissing('comments', [
            'id' => $comment->id,
        ]);
    }

    #[Test]
    public function user_cannot_delete_others_comment()
    {
        $otherUser = User::factory()->create();
        $comment = Comment::factory()->create([
            'task_id' => $this->task->id,
            'user_id' => $otherUser->id,
        ]);

        $response = $this->actingAs($this->user)
            ->delete("/comments/{$comment->id}");

        $response->assertStatus(403);
        $this->assertDatabaseHas('comments', [
            'id' => $comment->id,
        ]);
    }

    #[Test]
    public function comment_requires_content()
    {
        $response = $this->actingAs($this->user)
            ->post("/tasks/{$this->task->id}/comments", [
                'content' => '',
            ]);

        $response->assertSessionHasErrors('content');
    }

    #[Test]
    public function comments_include_user_information()
    {
        Comment::factory()->create([
            'task_id' => $this->task->id,
            'user_id' => $this->user->id,
        ]);

        $response = $this->actingAs($this->user)
            ->get("/tasks/{$this->task->id}/comments");

        $response->assertStatus(200);
        $response->assertJsonStructure([
            '*' => [
                'id',
                'content',
                'created_at',
                'user' => [
                    'id',
                    'name',
                    'email',
                ],
            ],
        ]);
    }

    #[Test]
    public function deleting_task_deletes_associated_comments()
    {
        $comment = Comment::factory()->create([
            'task_id' => $this->task->id,
            'user_id' => $this->user->id,
        ]);

        $this->actingAs($this->user)->delete("/tasks/{$this->task->id}");

        $this->assertDatabaseMissing('comments', [
            'id' => $comment->id,
        ]);

        $this->assertDatabaseMissing('tasks', [
            'id' => $this->task->id,
        ]);
    }
}
