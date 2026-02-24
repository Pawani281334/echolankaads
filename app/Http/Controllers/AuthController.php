<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8',
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
        ]);

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'access_token' => $token,
            'token_type' => 'Bearer',
            'user' => $user,
        ], 201);
    }

    public function login(Request $request)
    {
        if (!Auth::attempt($request->only('email', 'password'))) {
            return response()->json(['message' => 'Invalid login details'], 401);
        }

        $user = User::where('email', $request['email'])->firstOrFail();
        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'access_token' => $token,
            'token_type' => 'Bearer',
            'user' => $user,
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();
        return response()->json(['message' => 'Logged out successfully']);
    }

    public function redirectToProvider($provider)
    {
        return \Laravel\Socialite\Facades\Socialite::driver($provider)->stateless()->redirect();
    }

    public function updateProfile(Request $request)
    {
        $user = $request->user();
        
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'avatar' => 'sometimes|image|mimes:jpeg,png,jpg,gif|max:2048',
        ]);

        if ($request->has('name')) {
            $user->name = $validated['name'];
        }

        if ($request->hasFile('avatar')) {
            $path = $request->file('avatar')->store('avatars', 'public');
            $user->avatar = $path;
        }

        $user->save();

        return response()->json([
            'message' => 'Profile updated successfully',
            'user' => $user
        ]);
    }

    public function changePassword(Request $request)
    {
        $request->validate([
            'current_password' => 'required',
            'new_password' => 'required|string|min:8|confirmed',
        ]);

        $user = $request->user();

        if (!Hash::check($request->current_password, $user->password)) {
            return response()->json(['message' => 'Current password does not match'], 422);
        }

        $user->password = Hash::make($request->new_password);
        $user->save();

        return response()->json(['message' => 'Password changed successfully']);
    }

    public function handleProviderCallback($provider)
    {
        try {
            $socialUser = \Laravel\Socialite\Facades\Socialite::driver($provider)->stateless()->user();
        } catch (\Exception $e) {
            return redirect('/?error=social_login_failed');
        }

        $user = User::where('email', $socialUser->getEmail())->first();

        if (!$user) {
            $user = User::create([
                'name' => $socialUser->getName(),
                'email' => $socialUser->getEmail(),
                'google_id' => $provider === 'google' ? $socialUser->getId() : null,
                'facebook_id' => $provider === 'facebook' ? $socialUser->getId() : null,
                'password' => null, // Social login users don't have a password initially
            ]);
        } else {
            // Update social ID if not present
            if ($provider === 'google' && !$user->google_id) {
                $user->update(['google_id' => $socialUser->getId()]);
            }
            if ($provider === 'facebook' && !$user->facebook_id) {
                $user->update(['facebook_id' => $socialUser->getId()]);
            }
        }

        $token = $user->createToken('auth_token')->plainTextToken;
        $frontendUrl = env('FRONTEND_URL', 'http://localhost:5500');

        // Redirect to frontend with token
        return redirect($frontendUrl . '/?token=' . $token . '&user=' . urlencode(json_encode($user)));
    }
}
