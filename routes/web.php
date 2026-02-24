<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Artisan;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Here is where you can register web routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "web" middleware group. Make something great!
|
*/

Route::get('/create-storage-link', function () {
    try {
        Artisan::call('storage:link');
        return "Storage link created successfully!";
    } catch (\Exception $e) {
        return "Error creating storage link: " . $e->getMessage();
    }
});

Route::get('/run-migrations', function () {
    try {
        Artisan::call('migrate', ['--force' => true]);
        Artisan::call('db:seed', ['--class' => 'AdminUserSeeder', '--force' => true]);
        return "Migrations and seeding completed successfully!";
    } catch (\Exception $e) {
        return "Error running migrations: " . $e->getMessage();
    }
});

Route::get('/db-test', function () {
    try {
        \DB::connection()->getPdo();
        return "Database connection is working! Database: " . \DB::connection()->getDatabaseName();
    } catch (\Exception $e) {
        return "Database connection failed! Error: " . $e->getMessage();
    }
});

Route::fallback(function () {
    return file_get_contents(public_path('index.html'));
});
