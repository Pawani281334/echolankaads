<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

use App\Http\Controllers\AuthController;

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
Route::get('/auth/{provider}', [AuthController::class, 'redirectToProvider']);
Route::get('/auth/{provider}/callback', [AuthController::class, 'handleProviderCallback']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', function (Request $request) {
        return $request->user();
    });
    Route::post('/update-profile', [AuthController::class, 'updateProfile']);
    Route::post('/change-password', [AuthController::class, 'changePassword']);
});

use App\Http\Controllers\AdController;

Route::get('/ads', [AdController::class, 'index']);
Route::get('/ads/categories', [AdController::class, 'categories']);
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/ads', [AdController::class, 'store']);
    Route::put('/ads/{id}', [AdController::class, 'update']);
    Route::delete('/ads/{id}', [AdController::class, 'destroy']);
    Route::post('/ads/{id}/approve', [AdController::class, 'approve']);
});
