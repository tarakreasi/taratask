<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Board;
use App\Models\Task;
use App\Models\Tag;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class TagManagementTest extends TestCase
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
    public function user_can_create_a_tag()
    {
        $response = $this->actingAs($this->user)
            ->post('/tags', [
                'name' => 'Frontend',
                'color' => '#3B82F6',
                'board_id' => $this->board->id,
            ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('tags', [
            'name' => 'Frontend',
            'color' => '#3B82F6',
            'board_id' => $this->board->id,
        ]);
    }

    #[Test]
    public function user_can_delete_a_tag()
    {
        $tag = Tag::factory()->create([
            'board_id' => $this->board->id,
        ]);

        $response = $this->actingAs($this->user)
            ->deleteJson("/tags/{$tag->id}");

        $response->assertStatus(204);
        $this->assertDatabaseMissing('tags', [
            'id' => $tag->id,
        ]);
    }

    #[Test]
    public function tags_are_scoped_to_boards()
    {
        $board2 = Board::factory()->create(['user_id' => $this->user->id]);

        $tag1 = Tag::factory()->create(['board_id' => $this->board->id, 'name' => 'Tag1']);
        $tag2 = Tag::factory()->create(['board_id' => $board2->id, 'name' => 'Tag2']);

        $response = $this->actingAs($this->user)
            ->get("/?board_id={$this->board->id}");

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => 
            $page->component('Kanban')
                ->has('tags', 1)
                ->where('tags.0.name', 'Tag1')
        );
    }

    #[Test]
    public function task_can_have_multiple_tags()
    {
        $task = Task::factory()->create(['board_id' => $this->board->id]);
        $tag1 = Tag::factory()->create(['board_id' => $this->board->id]);
        $tag2 = Tag::factory()->create(['board_id' => $this->board->id]);

        $task->tags()->attach([$tag1->id, $tag2->id]);

        $this->assertEquals(2, $task->tags()->count());
    }

    #[Test]
    public function deleting_tag_removes_it_from_tasks()
    {
        $task = Task::factory()->create(['board_id' => $this->board->id]);
        $tag = Tag::factory()->create(['board_id' => $this->board->id]);

        $task->tags()->attach($tag->id);
        $this->assertEquals(1, $task->tags()->count());

        $this->actingAs($this->user)->delete("/tags/{$tag->id}");

        $task->refresh();
        $this->assertEquals(0, $task->tags()->count());
    }

    #[Test]
    public function tag_requires_name()
    {
        $response = $this->actingAs($this->user)
            ->post('/tags', [
                'color' => '#000000',
                'board_id' => $this->board->id,
            ]);

        $response->assertSessionHasErrors('name');
    }

    #[Test]
    public function tag_requires_board_id()
    {
        $response = $this->actingAs($this->user)
            ->post('/tags', [
                'name' => 'Test Tag',
                'color' => '#000000',
            ]);

        $response->assertSessionHasErrors('board_id');
    }
}
