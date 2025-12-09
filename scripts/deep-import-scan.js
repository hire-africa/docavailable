const fs = require('fs');
const path = require('path');

console.log('🔍 Deep Import Path Scan...\n');

// Define the correct import paths based on file location
const importPathMap = {
  // Files in app/ directory should use ./services/ or @/app/services/
  'app': {
    'apiService': './services/apiService',
    'localStorageService': './services/localStorageService',
    'authService': '@/services/authService',
    'adminService': '@/services/adminService',
    'locationService': '@/services/locationService',
    'chatApiService': '@/services/chatApiService',
    'notificationApiService': '@/services/notificationApiService',
    'walletApiService': '@/services/walletApiService',
    'hybridService': '@/services/hybridService',
    'chatbotService': '@/services/chatbotService',
    'paymentService': '@/services/paymentService'
  },
  // Files in app/chat/ directory should use ../../app/services/
  'app/chat': {
    'apiService': '../../app/services/apiService',
    'localStorageService': '../../app/services/localStorageService'
  },
  // Files in app/doctor-profile/ directory should use ../../app/services/
  'app/doctor-profile': {
    'apiService': '../../app/services/apiService'
  },
  // Files in app/appointment-details/ directory should use ../../app/services/
  'app/appointment-details': {
    'apiService': '../../app/services/apiService'
  },
  // Files in app/(tabs)/doctor-details/ directory should use ../../../app/services/
  'app/(tabs)/doctor-details': {
    'apiService': '../../../app/services/apiService'
  },
  // Files in components/ directory should use ../app/services/ for apiService
  'components': {
    'apiService': '../app/services/apiService',
    'authService': '../services/authService',
    'paymentService': '../services/paymentService',
    'chatbotService': '../services/chatbotService'
  },
  // Files in contexts/ directory should use ../app/services/ for apiService
  'contexts': {
    'apiService': '../app/services/apiService',
    'authService': '../services/authService'
  }
};

// Function to get the correct import path for a service
function getCorrectImportPath(filePath, serviceName) {
  const relativePath = path.relative(process.cwd(), filePath);
  const dirPath = path.dirname(relativePath);
  
  // Find the matching directory pattern
  for (const [pattern, services] of Object.entries(importPathMap)) {
    if (dirPath.startsWith(pattern) || dirPath === pattern) {
      if (services[serviceName]) {
        return services[serviceName];
      }
    }
  }
  
  // Default fallback
  if (dirPath.startsWith('app/')) {
    return `./services/${serviceName}`;
  } else {
    return `../services/${serviceName}`;
  }
}

// Function to scan and fix a file
function scanAndFixFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    let newContent = content;
    
    // Find all import statements for services
    const importRegex = /import\s+{?\s*(\w+)\s*}?\s+from\s+['"]([^'"]*services\/[^'"]*)['"]/g;
    let match;
    
    while ((match = importRegex.exec(content)) !== null) {
      const [fullMatch, serviceName, importPath] = match;
      const correctPath = getCorrectImportPath(filePath, serviceName);
      
      if (importPath !== correctPath) {
        console.log(`   🔧 Fixing: ${importPath} → ${correctPath}`);
        newContent = newContent.replace(fullMatch, 
          fullMatch.replace(importPath, correctPath)
        );
        modified = true;
      }
    }
    
    if (modified) {
      fs.writeFileSync(filePath, newContent, 'utf8');
      return true;
    }
    
    return false;
  } catch (error) {
    console.log(`   ❌ Error processing ${filePath}: ${error.message}`);
    return false;
  }
}

// Function to recursively scan directories
function scanDirectory(dirPath, extensions = ['.tsx', '.ts']) {
  const files = [];
  
  try {
    const items = fs.readdirSync(dirPath);
    
    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        // Skip node_modules and backup directories
        if (item !== 'node_modules' && item !== 'backup' && !item.startsWith('.')) {
          files.push(...scanDirectory(fullPath, extensions));
        }
      } else if (extensions.includes(path.extname(item))) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    console.log(`   ❌ Error scanning ${dirPath}: ${error.message}`);
  }
  
  return files;
}

// Main scanning process
console.log('1. Scanning for TypeScript/TSX files...');
const tsxFiles = scanDirectory('app', ['.tsx', '.ts']);
const componentFiles = scanDirectory('components', ['.tsx', '.ts']);
const contextFiles = scanDirectory('contexts', ['.tsx', '.ts']);

const allFiles = [...tsxFiles, ...componentFiles, ...contextFiles];
console.log(`   Found ${allFiles.length} files to scan`);

console.log('\n2. Analyzing import statements...');
let totalIssues = 0;
let fixedFiles = 0;

for (const file of allFiles) {
  const relativePath = path.relative(process.cwd(), file);
  console.log(`   📁 ${relativePath}`);
  
  const content = fs.readFileSync(file, 'utf8');
  const importRegex = /import\s+{?\s*(\w+)\s*}?\s+from\s+['"]([^'"]*services\/[^'"]*)['"]/g;
  let match;
  let fileIssues = 0;
  
  while ((match = importRegex.exec(content)) !== null) {
    const [fullMatch, serviceName, importPath] = match;
    const correctPath = getCorrectImportPath(file, serviceName);
    
    if (importPath !== correctPath) {
      console.log(`      ❌ ${serviceName}: ${importPath} (should be ${correctPath})`);
      fileIssues++;
    } else {
      console.log(`      ✅ ${serviceName}: ${importPath}`);
    }
  }
  
  if (fileIssues > 0) {
    totalIssues += fileIssues;
    if (scanAndFixFile(file)) {
      fixedFiles++;
    }
  }
}

console.log('\n3. Summary:');
console.log(`   • Files scanned: ${allFiles.length}`);
console.log(`   • Import issues found: ${totalIssues}`);
console.log(`   • Files fixed: ${fixedFiles}`);

if (totalIssues === 0) {
  console.log('\n🎉 All import paths are correct!');
} else {
  console.log(`\n🔧 Fixed ${fixedFiles} files with import path issues`);
}

// Verify specific problematic files
console.log('\n4. Verifying specific files...');

const specificFiles = [
  'app/chat/[chatId].tsx',
  'app/text-session-history.tsx',
  'app/doctor-profile/[id].tsx',
  'app/appointment-details/[id].tsx'
];

for (const file of specificFiles) {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    const hasApiService = content.includes('apiService');
    const hasLocalStorage = content.includes('localStorageService');
    
    console.log(`   📄 ${file}:`);
    if (hasApiService) {
      const apiMatch = content.match(/import.*apiService.*from\s+['"]([^'"]+)['"]/);
      if (apiMatch) {
        console.log(`      apiService: ${apiMatch[1]}`);
      }
    }
    if (hasLocalStorage) {
      const lsMatch = content.match(/import.*localStorageService.*from\s+['"]([^'"]+)['"]/);
      if (lsMatch) {
        console.log(`      localStorageService: ${lsMatch[1]}`);
      }
    }
  }
}

console.log('\n✅ Deep import scan completed!'); 