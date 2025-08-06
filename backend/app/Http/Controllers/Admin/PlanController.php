<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Plan;
use App\Http\Requests\PlanRequest;

class PlanController extends Controller
{
    // List all plans
    public function index()
    {
        return response()->json(['plans' => Plan::all()]);
    }

    // Create a new plan
    public function store(PlanRequest $request)
    {
        $plan = Plan::create([
            'name' => $request->name,
            'features' => json_encode($request->features),
            'currency' => $request->currency,
            'price' => $request->price,
            'duration' => $request->duration,
        ]);
        return response()->json(['message' => 'Plan created successfully', 'plan' => $plan], 201);
    }

    // Update a plan
    public function update(PlanRequest $request, $id)
    {
        $plan = Plan::findOrFail($id);
        $plan->update($request->only(['name', 'features', 'currency', 'price', 'duration']));
        return response()->json(['message' => 'Plan updated successfully', 'plan' => $plan]);
    }

    // Delete a plan
    public function destroy($id)
    {
        $plan = Plan::findOrFail($id);
        $plan->delete();
        return response()->json(['message' => 'Plan deleted successfully']);
    }
}
