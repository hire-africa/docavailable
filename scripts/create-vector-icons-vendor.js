const fs = require('fs');
const path = require('path');

console.log('🔧 Creating vector-icons vendor structure...');

// Paths
const expoVectorIconsPath = path.resolve(__dirname, '../node_modules/@expo/vector-icons');
const vendorPath = path.resolve(expoVectorIconsPath, 'vendor');
const libPath = path.resolve(expoVectorIconsPath, 'build');

console.log('Expo vector-icons path:', expoVectorIconsPath);
console.log('Vendor path:', vendorPath);
console.log('Lib path:', libPath);

// Check if @expo/vector-icons exists
if (!fs.existsSync(expoVectorIconsPath)) {
  console.log('❌ @expo/vector-icons not found');
  process.exit(1);
}

// Create vendor directory structure
if (!fs.existsSync(vendorPath)) {
  fs.mkdirSync(vendorPath, { recursive: true });
  console.log('✅ Created vendor directory');
}

// Create react-native-vector-icons directory in vendor
const rnVectorIconsPath = path.resolve(vendorPath, 'react-native-vector-icons');
if (!fs.existsSync(rnVectorIconsPath)) {
  fs.mkdirSync(rnVectorIconsPath, { recursive: true });
  console.log('✅ Created react-native-vector-icons directory');
}

// Create lib directory in vendor
const vendorLibPath = path.resolve(rnVectorIconsPath, 'lib');
if (!fs.existsSync(vendorLibPath)) {
  fs.mkdirSync(vendorLibPath, { recursive: true });
  console.log('✅ Created lib directory in vendor');
}

// Copy necessary files from @expo/vector-icons build to vendor
if (fs.existsSync(libPath)) {
  const buildFiles = fs.readdirSync(libPath);
  
  buildFiles.forEach(file => {
    if (file.endsWith('.js')) {
      const sourceFile = path.resolve(libPath, file);
      const targetFile = path.resolve(vendorLibPath, file);
      
      try {
        fs.copyFileSync(sourceFile, targetFile);
        console.log(`✅ Copied ${file} to vendor/lib`);
      } catch (error) {
        console.log(`⚠️ Could not copy ${file}:`, error.message);
      }
    }
  });
}

// Create specific files that @expo/vector-icons expects
const requiredFiles = [
  'icon-button.js',
  'create-icon-set.js',
  'create-icon-set-from-icomoon.js',
  'create-multi-style-icon-set.js',
  'tab-bar-item-ios.js',
  'toolbar-android.js'
];

requiredFiles.forEach(fileName => {
  const targetFile = path.resolve(vendorLibPath, fileName);
  
  if (!fs.existsSync(targetFile)) {
    // Create a simple stub file
    const stubContent = `// Stub file for ${fileName}
module.exports = require('@expo/vector-icons/build/${fileName.replace('.js', '')}');
`;
    
    try {
      fs.writeFileSync(targetFile, stubContent);
      console.log(`✅ Created stub for ${fileName}`);
    } catch (error) {
      console.log(`⚠️ Could not create ${fileName}:`, error.message);
    }
  }
});

console.log('🔧 Vector-icons vendor structure created successfully!'); 