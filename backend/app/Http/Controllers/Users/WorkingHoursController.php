<?php
namespace App\Http\Controllers\Users;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\User;
use App\Http\Requests\WorkingHoursRequest;

class WorkingHoursController extends Controller
{
    public function workinghours(Request $request)
    {
        $user = User::find(auth()->user()->id);
        return response()->json(["user" => $user->with('workinghours')->get()]);
    }

    public function create_workinghours(WorkingHoursRequest $request)
    {
        if (!auth()->user()->isDoctor()) {
            return response()->json(['error' => 'Only doctors can modify working hours'], 403);
        }
        $user = User::find(auth()->user()->id);
        $user->workinghours()->create([
            'day' => $request->day,
            'start_time' => $request->start_time,
            'end_time' => $request->end_time,
        ]);
        return response()->json($user->workinghours);
    }

    public function update_workinghours(WorkingHoursRequest $request)
    {
        if (!auth()->user()->isDoctor()) {
            return response()->json(['error' => 'Only doctors can modify working hours'], 403);
        }
        $user = User::find(auth()->user()->id);
        $user->workinghours()->update([
            'day' => $request->day,
            'start_time' => $request->start_time,
            'end_time' => $request->end_time,
        ]);
        return response()->json($user->workinghours);
    }

    public function delete_workinghours(Request $request)
    {
        if (!auth()->user()->isDoctor()) {
            return response()->json(['error' => 'Only doctors can modify working hours'], 403);
        }
        $user = User::find(auth()->user()->id);
        $user->workinghours()->delete();
        return response()->json(["message" => "Working hours deleted successfully"]);
    }
    
}
