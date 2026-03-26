<?php
require "vendor/autoload.php";
$app = require_once "bootstrap/app.php";
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$total = \App\Models\Reviews::count();
$pending = \App\Models\Reviews::where("status", "pending")->count();
$approved = \App\Models\Reviews::where("status", "approved")->count();

echo "Total Reviews: $total\n";
echo "Pending Reviews: $pending\n";
echo "Approved Reviews: $approved\n";

$doctorsWithReviews = \App\Models\Reviews::distinct('doctor_id')->count('doctor_id');
echo "Doctors with reviews: $doctorsWithReviews\n";

// List some doctors with their rating and total_ratings
$doctors = \App\Models\User::where('user_type', 'doctor')
    ->where('total_ratings', '>', 0)
    ->limit(5)
    ->get(['id', 'first_name', 'last_name', 'rating', 'total_ratings']);

echo "Doctors with total_ratings > 0:\n";
foreach ($doctors as $d) {
    echo "ID: $d->id, Name: $d->first_name $d->last_name, Rating: $d->rating, Total: $d->total_ratings\n";
}
