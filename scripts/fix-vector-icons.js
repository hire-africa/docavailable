const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing vector-icons module resolution...');

// Check if vector-icons files exist
const vectorIconsPath = path.resolve(__dirname, '../node_modules/react-native-vector-icons');
const expoVectorIconsPath = path.resolve(__dirname, '../node_modules/@expo/vector-icons');

console.log('Checking vector-icons installation...');

if (!fs.existsSync(vectorIconsPath)) {
  console.log('❌ react-native-vector-icons not found');
  console.log('Installing react-native-vector-icons...');
  require('child_process').execSync('npm install react-native-vector-icons', { stdio: 'inherit' });
} else {
  console.log('✅ react-native-vector-icons found');
}

if (!fs.existsSync(expoVectorIconsPath)) {
  console.log('❌ @expo/vector-icons not found');
  console.log('Installing @expo/vector-icons...');
  require('child_process').execSync('npm install @expo/vector-icons', { stdio: 'inherit' });
} else {
  console.log('✅ @expo/vector-icons found');
}

// Check for vendor directory
const vendorPath = path.resolve(vectorIconsPath, 'vendor');
if (!fs.existsSync(vendorPath)) {
  console.log('❌ Vendor directory not found, creating symlinks...');
  
  // Create vendor directory structure
  const libPath = path.resolve(vectorIconsPath, 'lib');
  if (fs.existsSync(libPath)) {
    if (!fs.existsSync(vendorPath)) {
      fs.mkdirSync(vendorPath, { recursive: true });
    }
    
    const vendorLibPath = path.resolve(vendorPath, 'react-native-vector-icons/lib');
    if (!fs.existsSync(vendorLibPath)) {
      fs.mkdirSync(vendorLibPath, { recursive: true });
    }
    
    // Copy lib files to vendor
    const libFiles = fs.readdirSync(libPath);
    libFiles.forEach(file => {
      const sourceFile = path.resolve(libPath, file);
      const targetFile = path.resolve(vendorLibPath, file);
      
      if (fs.statSync(sourceFile).isFile()) {
        fs.copyFileSync(sourceFile, targetFile);
        console.log(`✅ Copied ${file} to vendor directory`);
      }
    });
  }
} else {
  console.log('✅ Vendor directory found');
}

console.log('🔧 Vector-icons fix completed!'); 