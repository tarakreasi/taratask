<?php

namespace Database\Seeders;

use App\Models\Board;
use App\Models\Tag;
use App\Models\Task;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $user = User::firstOrCreate(
            ['email' => 'twantoro'],
            [
                'name' => 'twantoro',
                'password' => Hash::make(env('ADMIN_INITIAL_PASSWORD', 'password')),
            ]
        );

        $opsBoard = Board::firstOrCreate(
            ['user_id' => $user->id, 'title' => 'Infra & Subscriptions'],
            [
                'description' => 'Jadwal langganan VPS, Domain, dan pemeliharaan server Tarakreasi',
                'theme_color' => '#3B82F6',
                'wip_limits' => ['todo' => 10, 'in-progress' => 2, 'in-review' => 2],
            ]
        );

        $tagVps = Tag::firstOrCreate(
            ['board_id' => $opsBoard->id, 'name' => 'VPS Cloud'],
            ['color' => '#8B5CF6']
        );

        $tagDomain = Tag::firstOrCreate(
            ['board_id' => $opsBoard->id, 'name' => 'Domain & SSL'],
            ['color' => '#10B981']
        );

        $vpsTask = Task::firstOrCreate(
            ['board_id' => $opsBoard->id, 'title' => 'Perpanjang VPS Tencent Cloud (tarakreasi.com)'],
            [
                'description' => 'Lighthouse Singapore (ap-singapore-4) | Instance: lhins-o88xmfop (ins-p08cohnu) | IP: 43.156.130.83 / Tailscale: 100.64.10.3. Dibuat: 23 April 2026.',
                'priority' => 'high',
                'status' => 'todo',
                'due_date' => '2027-04-23',
                'recurrence_interval' => 'yearly',
                'subtasks' => [
                    ['id' => 'st-vps-1', 'title' => 'Cek tagihan di konsol Tencent Cloud (App ID: 1397673090)', 'completed' => false],
                    ['id' => 'st-vps-2', 'title' => 'Verifikasi layanan systemd & Caddy pasca perpanjangan', 'completed' => false],
                ],
            ]
        );
        $vpsTask->tags()->syncWithoutDetaching([$tagVps->id]);

        $domainTask = Task::firstOrCreate(
            ['board_id' => $opsBoard->id, 'title' => 'Perpanjang Domain tarakreasi.com (DomaiNesia)'],
            [
                'description' => 'Registrar: DomaiNesia (dns1-dns4.domainesia.com). Diperpanjang terakhir: 18 Sep 2026.',
                'priority' => 'high',
                'status' => 'todo',
                'due_date' => '2027-09-24',
                'recurrence_interval' => 'yearly',
                'subtasks' => [
                    ['id' => 'st-dom-1', 'title' => 'Bayar invoice perpanjangan domain di DomaiNesia', 'completed' => false],
                    ['id' => 'st-dom-2', 'title' => 'Cek auto-renew sertifikat SSL Let\'s Encrypt', 'completed' => false],
                ],
            ]
        );
        $domainTask->tags()->syncWithoutDetaching([$tagDomain->id]);

        Board::firstOrCreate(
            ['user_id' => $user->id, 'title' => 'Parking Lot (Ide & Nanti Saja)'],
            [
                'description' => 'Tempat menaruh ide/pikiran agar tidak memenuhi RAM kepala hari ini',
                'theme_color' => '#10B981',
                'wip_limits' => ['todo' => 20, 'in-progress' => 1, 'in-review' => 1],
            ]
        );
    }
}
