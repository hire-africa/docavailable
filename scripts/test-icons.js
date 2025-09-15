const fs = require('fs');
const path = require('path');

// Test the Icon component by checking if all icon names are valid
const iconComponentPath = path.join(__dirname, '../components/Icon.tsx');

try {
  const iconContent = fs.readFileSync(iconComponentPath, 'utf8');
  
  // Extract IconNames object
  const iconNamesMatch = iconContent.match(/export const IconNames = \{([^}]+)\}/);
  
  if (iconNamesMatch) {
    const iconNamesSection = iconNamesMatch[1];
    
    // Count the number of icon definitions
    const iconCount = (iconNamesSection.match(/[a-zA-Z_][a-zA-Z0-9_]*:/g) || []).length;
    
    console.log('✅ Icon component found');
    console.log(`📊 Total icons available: ${iconCount}`);
    
    // Check for specific important icons
    const importantIcons = ['home', 'user', 'search', 'message', 'file', 'userMd'];
    const missingIcons = [];
    
    importantIcons.forEach(icon => {
      if (!iconNamesSection.includes(`${icon}:`)) {
        missingIcons.push(icon);
      }
    });
    
    if (missingIcons.length === 0) {
      console.log('✅ All important icons are available');
    } else {
      console.log('❌ Missing icons:', missingIcons);
    }
    
    // Check tab icons specifically
    const tabIcons = ['home', 'search', 'message', 'file', 'userMd'];
    const missingTabIcons = [];
    
    tabIcons.forEach(icon => {
      if (!iconNamesSection.includes(`${icon}:`)) {
        missingTabIcons.push(icon);
      }
    });
    
    if (missingTabIcons.length === 0) {
      console.log('✅ All tab icons are available');
    } else {
      console.log('❌ Missing tab icons:', missingTabIcons);
    }
    
  } else {
    console.log('❌ Could not find IconNames object in Icon component');
  }
  
} catch (error) {
  console.error('❌ Error reading Icon component:', error.message);
}

console.log('\n🎉 Icon implementation test completed!'); 