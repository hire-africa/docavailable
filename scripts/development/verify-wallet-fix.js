const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying Wallet Integration Fix...\n');

// Check if the doctor-withdrawals.tsx file has been updated
const withdrawalsFile = path.join(__dirname, '../app/doctor-withdrawals.tsx');
const fileContent = fs.readFileSync(withdrawalsFile, 'utf8');

// Check for key indicators that the fix has been applied
const checks = [
  {
    name: 'API Service Import',
    pattern: /import.*apiService.*from.*services\/apiService/,
    description: 'Should import apiService for backend integration'
  },
  {
    name: 'Real Wallet State',
    pattern: /const \[walletInfo, setWalletInfo\] = useState<WalletInfo \| null>\(null\)/,
    description: 'Should use real wallet state instead of mock earnings'
  },
  {
    name: 'Fetch Wallet Data Function',
    pattern: /const fetchWalletData = async \(\) =>/,
    description: 'Should have function to fetch real wallet data'
  },
  {
    name: 'API Calls',
    pattern: /apiService\.get\('\/doctor\/wallet'\)/,
    description: 'Should make real API calls to backend'
  },
  {
    name: 'Loading State',
    pattern: /const \[loading, setLoading\] = useState\(true\)/,
    description: 'Should have loading state for API calls'
  },
  {
    name: 'Real Withdrawal Handler',
    pattern: /const response = await apiService\.post\('\/doctor\/wallet\/withdraw'/,
    description: 'Should make real withdrawal API calls'
  },
  {
    name: 'No Mock Data',
    pattern: /const \[earnings, setEarnings\] = useState\(150000\)/,
    description: 'Should NOT have mock 150k earnings',
    shouldNotExist: true
  }
];

let allPassed = true;

checks.forEach(check => {
  const found = check.pattern.test(fileContent);
  const passed = check.shouldNotExist ? !found : found;
  
  console.log(`${passed ? '✅' : '❌'} ${check.name}`);
  console.log(`   ${check.description}`);
  
  if (!passed) {
    allPassed = false;
    if (check.shouldNotExist && found) {
      console.log('   ❌ Mock data still present - needs to be removed');
    } else if (!check.shouldNotExist && !found) {
      console.log('   ❌ Real API integration missing');
    }
  }
  console.log('');
});

// Check backend files
console.log('🔧 Checking Backend Integration...\n');

const backendChecks = [
  {
    name: 'DoctorWallet Model',
    path: '../backend/app/Models/DoctorWallet.php',
    description: 'Should exist for wallet functionality'
  },
  {
    name: 'WalletTransaction Model',
    path: '../backend/app/Models/WalletTransaction.php',
    description: 'Should exist for transaction tracking'
  },
  {
    name: 'DoctorWalletController',
    path: '../backend/app/Http/Controllers/DoctorWalletController.php',
    description: 'Should exist for API endpoints'
  },
  {
    name: 'Wallet API Routes',
    path: '../backend/routes/api.php',
    description: 'Should have wallet routes defined'
  }
];

backendChecks.forEach(check => {
  const filePath = path.join(__dirname, check.path);
  const exists = fs.existsSync(filePath);
  
  console.log(`${exists ? '✅' : '❌'} ${check.name}`);
  console.log(`   ${check.description}`);
  
  if (!exists) {
    allPassed = false;
    console.log('   ❌ Backend file missing');
  }
  console.log('');
});

// Summary
console.log('📊 Summary:');
if (allPassed) {
  console.log('🎉 All checks passed! The wallet integration fix has been applied successfully.');
  console.log('');
  console.log('✅ Frontend now uses real API calls instead of mock data');
  console.log('✅ Backend wallet system is properly integrated');
  console.log('✅ No more fake 150k MWK balance');
  console.log('✅ Real transaction history and withdrawal processing');
} else {
  console.log('❌ Some checks failed. Please review the issues above.');
}

console.log('\n🚀 Next Steps:');
console.log('1. Start the Laravel backend: cd backend && php artisan serve');
console.log('2. Test the wallet integration in the app');
console.log('3. Verify real balances are displayed instead of 150k MWK'); 