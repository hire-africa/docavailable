<?php

// Deploy migration script for live server
echo "🚀 DEPLOYING MIGRATION TO LIVE SERVER\n";
echo "=====================================\n\n";

echo "📋 DEPLOYMENT STEPS:\n";
echo "1. ✅ Changes pushed to GitHub\n";
echo "2. 🔄 Pull latest changes on live server\n";
echo "3. 🗄️  Run database migration\n";
echo "4. 🧹 Clear caches\n";
echo "5. ✅ Test the Buy Now button\n\n";

echo "🎯 COMMANDS TO RUN ON LIVE SERVER:\n";
echo "==================================\n";
echo "1. git pull origin main\n";
echo "2. php artisan migrate --path=database/migrations/2025_01_16_000001_add_missing_fields_to_plans_table.php\n";
echo "3. php artisan config:clear\n";
echo "4. php artisan cache:clear\n";
echo "5. Test the Buy Now button\n\n";

echo "🔍 MIGRATION DETAILS:\n";
echo "=====================\n";
echo "Migration file: 2025_01_16_000001_add_missing_fields_to_plans_table.php\n";
echo "Purpose: Add missing fields to plans table\n";
echo "Fields to add:\n";
echo "- text_sessions (integer, default 0)\n";
echo "- voice_calls (integer, default 0)\n";
echo "- video_calls (integer, default 0)\n";
echo "- duration (integer, default 30)\n\n";

echo "📊 EXPECTED RESULT:\n";
echo "==================\n";
echo "After running the migration:\n";
echo "1. ✅ Plans table will have the required fields\n";
echo "2. ✅ Subscription creation will work\n";
echo "3. ✅ Buy Now button will create subscriptions\n";
echo "4. ✅ PayChangu webhooks will process successfully\n\n";

echo "🧪 TEST AFTER DEPLOYMENT:\n";
echo "========================\n";
echo "Run this command to test if deployment worked:\n";
echo "php scripts/check_deployment_status.php\n\n";

echo "🎉 SUCCESS INDICATORS:\n";
echo "=====================\n";
echo "✅ Test webhook endpoint returns HTTP 200\n";
echo "✅ Manual transaction creation endpoint returns HTTP 200\n";
echo "✅ Webhook processing returns HTTP 200 with success=true\n";
echo "✅ Buy Now button creates subscriptions\n\n";

echo "⚠️  TROUBLESHOOTING:\n";
echo "==================\n";
echo "If migration fails:\n";
echo "1. Check database connection\n";
echo "2. Check if fields already exist\n";
echo "3. Check Laravel logs\n";
echo "4. Run: php artisan migrate:status\n\n";

echo "🚀 READY TO DEPLOY!\n";
echo "Run the commands above on your live server.\n"; 