<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class AdminUserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $admins = [
            [
                'name' => 'Admin One',
                'email' => 'admin1@echolanka.com',
                'password' => 'Admin123!',
                'is_admin' => true,
            ],
            [
                'name' => 'Admin Two',
                'email' => 'admin2@echolanka.com',
                'password' => 'Admin123!',
                'is_admin' => true,
            ],
            [
                'name' => 'Admin Three',
                'email' => 'admin3@echolanka.com',
                'password' => 'Admin123!',
                'is_admin' => true,
            ],
            [
                'name' => 'Admin Four',
                'email' => 'admin4@echolanka.com',
                'password' => 'Admin123!',
                'is_admin' => true,
            ],
        ];

        foreach ($admins as $admin) {
            \App\Models\User::updateOrCreate(
                ['email' => $admin['email']],
                [
                    'name' => $admin['name'],
                    'password' => \Illuminate\Support\Facades\Hash::make($admin['password']),
                    'is_admin' => $admin['is_admin'],
                ]
            );
        }
    }
}
