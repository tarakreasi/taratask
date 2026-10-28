<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Board;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class BoardManagementTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();
        
        $this->user = User::factory()->create();
    }

    #[Test]
    public function user_can_create_a_board()
    {
        $response = $this->actingAs($this->user)
            ->post('/boards', [
                'title' => 'Work Projects',
                'theme_color' => '#FF5733',
            ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('boards', [
            'title' => 'Work Projects',
            'theme_color' => '#FF5733',
            'user_id' => $this->user->id,
        ]);
    }

    #[Test]
    public function user_can_update_board_title()
    {
        $board = Board::factory()->create([
            'user_id' => $this->user->id,
            'title' => 'Original Title',
        ]);

        $response = $this->actingAs($this->user)
            ->put("/boards/{$board->id}", [
                'title' => 'Updated Title',
            ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('boards', [
            'id' => $board->id,
            'title' => 'Updated Title',
        ]);
    }

    #[Test]
    public function user_can_update_board_theme_color()
    {
        $board = Board::factory()->create([
            'user_id' => $this->user->id,
            'theme_color' => '#000000',
        ]);

        $response = $this->actingAs($this->user)
            ->put("/boards/{$board->id}", [
                'theme_color' => '#FF0000',
            ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('boards', [
            'id' => $board->id,
            'theme_color' => '#FF0000',
        ]);
    }

    #[Test]
    public function user_can_delete_a_board()
    {
        $board = Board::factory()->create([
            'user_id' => $this->user->id,
        ]);

        $response = $this->actingAs($this->user)
            ->delete("/boards/{$board->id}");

        $response->assertRedirect();
        $this->assertDatabaseMissing('boards', [
            'id' => $board->id,
        ]);
    }

    #[Test]
    public function user_can_view_their_boards_on_kanban_page()
    {
        $board1 = Board::factory()->create(['user_id' => $this->user->id, 'title' => 'Board 1']);
        $board2 = Board::factory()->create(['user_id' => $this->user->id, 'title' => 'Board 2']);

        $response = $this->actingAs($this->user)
            ->get('/');

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => 
            $page->component('Kanban')
                ->has('boards', 2)
        );
    }

    #[Test]
    public function user_can_switch_between_boards()
    {
        $board1 = Board::factory()->create(['user_id' => $this->user->id]);
        $board2 = Board::factory()->create(['user_id' => $this->user->id]);

        $response = $this->actingAs($this->user)
            ->get("/kanban?board_id={$board2->id}");

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => 
            $page->where('activeBoard.id', $board2->id)
        );
    }

    #[Test]
    public function user_cannot_delete_others_board()
    {
        $otherUser = User::factory()->create();
        $otherBoard = Board::factory()->create([
            'user_id' => $otherUser->id,
        ]);

        $response = $this->actingAs($this->user)
            ->delete("/boards/{$otherBoard->id}");

        $response->assertStatus(403);
        $this->assertDatabaseHas('boards', [
            'id' => $otherBoard->id,
        ]);
    }

    #[Test]
    public function user_cannot_update_others_board()
    {
        $otherUser = User::factory()->create();
        $otherBoard = Board::factory()->create([
            'user_id' => $otherUser->id,
            'title' => 'Original',
        ]);

        $response = $this->actingAs($this->user)
            ->put("/boards/{$otherBoard->id}", [
                'title' => 'Hacked',
            ]);

        $response->assertStatus(403);
        $this->assertDatabaseHas('boards', [
            'id' => $otherBoard->id,
            'title' => 'Original',
        ]);
    }

    #[Test]
    public function board_requires_title()
    {
        $response = $this->actingAs($this->user)
            ->post('/boards', [
                'theme_color' => '#000000',
            ]);

        $response->assertSessionHasErrors('title');
    }

    #[Test]
    public function board_theme_color_defaults_if_not_provided()
    {
        $response = $this->actingAs($this->user)
            ->post('/boards', [
                'title' => 'New Board',
            ]);

        $response->assertRedirect();
        
        $board = Board::where('title', 'New Board')->first();
        $this->assertNotNull($board->theme_color);
    }
}
