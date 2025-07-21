const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying Import Fix...\n');

// Check if the text-session-history.tsx file exists and has the correct import
const filePath = path.join(__dirname, '..', 'app', 'text-session-history.tsx');

if (!fs.existsSync(filePath)) {
  console.log('❌ text-session-history.tsx file not found');
  process.exit(1);
}

console.log('✅ text-session-history.tsx file exists');

// Read the file content
const content = fs.readFileSync(filePath, 'utf8');

// Check for the correct import path
if (content.includes("import { apiService } from './services/apiService'")) {
  console.log('✅ Correct import path found: ./services/apiService');
} else if (content.includes("import { apiService } from '../services/apiService'")) {
  console.log('❌ Wrong import path still exists: ../services/apiService');
  console.log('   This will cause bundling errors');
} else {
  console.log('⚠️  apiService import not found or has different format');
  console.log('   Please check the import statement manually');
}

// Check if apiService.ts exists
const apiServicePath = path.join(__dirname, '..', 'app', 'services', 'apiService.ts');
if (fs.existsSync(apiServicePath)) {
  console.log('✅ apiService.ts file exists');
} else {
  console.log('❌ apiService.ts file not found');
}

console.log('\n📋 Summary:');
console.log('   • File exists: ✅');
console.log('   • Import path: ' + (content.includes("import { apiService } from './services/apiService'") ? '✅ Fixed' : '❌ Needs fixing'));
console.log('   • Target file exists: ✅');

if (content.includes("import { apiService } from './services/apiService'")) {
  console.log('\n🎉 Import issue is FIXED!');
  console.log('   The bundling error should now be resolved.');
} else {
  console.log('\n⚠️  Import issue still needs attention.');
  console.log('   Please check the import statement in text-session-history.tsx');
} 