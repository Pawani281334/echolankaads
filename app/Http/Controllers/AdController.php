<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Ad;

class AdController extends Controller
{
    public function index(Request $request)
    {
        $query = Ad::query();
        
        // Use manual sanctum check for public route
        $user = auth('sanctum')->user();
        
        // Admins can see all if they request admin_view
        if ($request->has('admin_view') && $user && $user->is_admin) {
             // Show all statuses for admins in admin view
        } 
        // Users can see their own pending ads
        elseif ($request->has('user_id') && $user && (int)$request->user_id === $user->id) {
            // Show all statuses for owner
        }
        else {
            $query->where('status', 'approved');
        }

        if ($request->has('search')) {
            $query->where('title', 'like', '%' . $request->search . '%');
        }

        if ($request->has('location')) {
            $query->where('location', $request->location);
        }

        if ($request->has('category')) {
            $query->where('category', $request->category);
        }

        if ($request->has('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        if ($request->has('min_price')) {
            $query->where('price', '>=', $request->min_price);
        }

        if ($request->has('max_price')) {
            $query->where('price', '<=', $request->max_price);
        }

        $sort = $request->get('sort', 'newest');
        if ($sort === 'price_asc') {
            $query->orderBy('price', 'asc');
        } elseif ($sort === 'price_desc') {
            $query->orderBy('price', 'desc');
        } else {
            $query->latest();
        }

        return response()->json($query->get());
    }

    private function hasProhibitedContent($text)
    {
        $keywords = [
            'porn', 'sex', 'naked', 'explicit', 'adult', 'dating', 'escort', 'hot girls', 'xxx',
            'ලිංගික', 'කුණු', 'අසභ්‍ය', 'හොට්', 'කෙල්ලෝ', 'සෙක්ස්',
            'பாலியல்', 'ஆபாச', 'நிர்வாண'
        ];
        
        $text = mb_strtolower($text);
        foreach ($keywords as $word) {
            if (mb_strpos($text, mb_strtolower($word)) !== false) {
                return true;
            }
        }
        return false;
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'price' => 'required|numeric',
            'description' => 'required|string',
            'image' => 'required|image|mimes:jpeg,png,jpg,gif|max:2048',
            'phone' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
            'location' => 'nullable|string|max:100',
            'category' => 'nullable|string|max:100',
        ]);

        if ($this->hasProhibitedContent($validated['title']) || $this->hasProhibitedContent($validated['description'])) {
            return response()->json(['message' => 'Prohibited content detected. Please follow our community guidelines.'], 422);
        }

        $path = $request->file('image')->store('ads', 'public');

        $ad = Ad::create([
            'user_id' => $request->user()->id,
            'title' => $validated['title'],
            'price' => $validated['price'],
            'description' => $validated['description'],
            'image' => $path,
            'phone' => $validated['phone'] ?? null,
            'email' => $validated['email'] ?? null,
            'location' => $validated['location'] ?? null,
            'category' => $validated['category'] ?? null,
            'status' => $request->user()->is_admin ? 'approved' : 'pending',
        ]);

        return response()->json($ad, 201);
    }
    public function update(Request $request, $id)
    {
        $ad = Ad::findOrFail($id);

        if ($ad->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'price' => 'required|numeric',
            'description' => 'required|string',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
            'phone' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
            'location' => 'nullable|string|max:100',
            'category' => 'nullable|string|max:100',
        ]);

        if ($this->hasProhibitedContent($validated['title']) || $this->hasProhibitedContent($validated['description'])) {
            return response()->json(['message' => 'Prohibited content detected. Please follow our community guidelines.'], 422);
        }

        if ($request->hasFile('image')) {
            $path = $request->file('image')->store('ads', 'public');
            $ad->image = $path;
        }

        $ad->update([
            'title' => $validated['title'],
            'price' => $validated['price'],
            'description' => $validated['description'],
            'phone' => $validated['phone'] ?? null,
            'email' => $validated['email'] ?? null,
            'location' => $validated['location'] ?? null,
            'category' => $validated['category'] ?? null,
        ]);

        return response()->json($ad);
    }

    public function destroy(Request $request, $id)
    {
        $ad = Ad::findOrFail($id);

        if ($ad->user_id !== $request->user()->id && !$request->user()->is_admin) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $ad->delete();

        return response()->json(['message' => 'Ad deleted successfully']);
    }

    public function categories()
    {
        $counts = Ad::where('status', 'approved')->select('category', \DB::raw('count(*) as total'))
            ->groupBy('category')
            ->get()
            ->pluck('total', 'category');

        return response()->json($counts);
    }

    public function approve($id)
    {
        if (!auth()->user()->is_admin) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $ad = Ad::findOrFail($id);
        $ad->update(['status' => 'approved']);

        return response()->json(['message' => 'Ad approved successfully', 'ad' => $ad]);
    }
}
