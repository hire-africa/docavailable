#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Files that need to be fixed
const filesToFix = [
  'app/(tabs)/doctor-details/[uid].tsx',
  'app/doctor-profile.tsx',
  'app/integration-test.tsx',
  'app/network-test.tsx',
  'app/edit-doctor-profile.tsx',
  'app/privacy-settings.tsx',
  'app/patient-profile.tsx',
  'app/notifications-settings.tsx',
  'app/edit-patient-profile.tsx',
  'app/backend-test.tsx',
  'app/(tabs)/doctor-details/BookAppointmentFlow.tsx',
  'components/NetworkStatusIndicator.tsx',
  'utils/networkDiagnostics.ts'
];

// Fix import paths
function fixApiServiceImports() {
  console.log('🔧 Fixing ApiService import paths...');
  
  let fixedCount = 0;
  
  filesToFix.forEach(filePath => {
    const fullPath = path.join(__dirname, filePath);
    
    if (fs.existsSync(fullPath)) {
      try {
        let content = fs.readFileSync(fullPath, 'utf8');
        let modified = false;
        
        // Fix various import patterns
        const patterns = [
          {
            from: /import\s*{\s*apiService\s*}\s*from\s*['"]\.\.\/\.\.\/services\/apiService['"]/g,
            to: "import { apiService } from '../../app/services/apiService'"
          },
          {
            from: /import\s*{\s*apiService\s*}\s*from\s*['"]\.\.\/services\/apiService['"]/g,
            to: "import { apiService } from '../app/services/apiService'"
          },
          {
            from: /import\s*{\s*apiService\s*}\s*from\s*['"]\.\/services\/apiService['"]/g,
            to: "import { apiService } from './app/services/apiService'"
          }
        ];
        
        patterns.forEach(pattern => {
          if (pattern.from.test(content)) {
            content = content.replace(pattern.from, pattern.to);
            modified = true;
          }
        });
        
        if (modified) {
          fs.writeFileSync(fullPath, content, 'utf8');
          console.log(`✅ Fixed: ${filePath}`);
          fixedCount++;
        } else {
          console.log(`⏭️ No changes needed: ${filePath}`);
        }
        
      } catch (error) {
        console.error(`❌ Error fixing ${filePath}:`, error.message);
      }
    } else {
      console.log(`⚠️ File not found: ${filePath}`);
    }
  });
  
  console.log(`\n🎉 Fixed ${fixedCount} files`);
}

// Run the fix
fixApiServiceImports();
