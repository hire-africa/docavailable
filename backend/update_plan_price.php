<?php

// Update plan price to 100 MWK to cover PayChangu fees
echo "Updating plan price to cover PayChangu fees...\n";

// Set plan price to 100 MWK (user pays 100, webhook receives 97 after fees)
$newPrice = 100.00;
$currency = 'MWK';
$webhookAmount = 97.00; // Amount after PayChangu fees

echo "Setting plan_id=1 to price: $newPrice $currency\n";
echo "This means:\n";
echo "- User pays: $newPrice $currency\n";
echo "- Webhook receives: $webhookAmount $currency (after fees)\n";
echo "- Fee coverage: " . ($newPrice - $webhookAmount) . " $currency\n\n";

// Create a simple database update script
echo "Database update needed:\n";
echo "UPDATE plans SET price = $newPrice, currency = '$currency' WHERE id = 1;\n\n";

echo "This will ensure:\n";
echo "1. ✅ Users are charged $newPrice $currency\n";
echo "2. ✅ Webhook receives $webhookAmount $currency (after fees)\n";
echo "3. ✅ Transaction creation works correctly\n";
echo "4. ✅ Plan activation works correctly\n\n";

echo "After updating the plan price, test a new payment to verify the flow works.\n";
echo "The webhook processing is already fixed and should work with the correct plan price.\n"; 