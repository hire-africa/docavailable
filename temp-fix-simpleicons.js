const fs = require('fs');
const path = require('path');

// Function to recursively find all .tsx files
function findTsxFiles(dir) {
  const files = [];
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules' && item !== 'backup') {
      files.push(...findTsxFiles(fullPath));
    } else if (item.endsWith('.tsx')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

// Function to temporarily fix SimpleIcons usage in a file
function fixSimpleIconsInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Replace all SimpleIcons usage with simple text placeholders
    content = content.replace(
      /<SimpleIcons\.[^>]+>/g,
      '<Text>📱</Text>'
    );
    
    // Fix import paths
    content = content.replace(
      /import\s+\{\s*SimpleIcons\s*\}\s+from\s+['"]\.\.\/components\/SimpleIcons['"]/g,
      "import { SimpleIcons } from '../../components/SimpleIcons'"
    );
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Fixed: ${filePath}`);
    }
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
  }
}

// Main execution
const projectRoot = process.cwd();
const tsxFiles = findTsxFiles(projectRoot);

console.log(`Found ${tsxFiles.length} .tsx files to process`);

for (const file of tsxFiles) {
  fixSimpleIconsInFile(file);
}

console.log('Temporary SimpleIcons fixes completed!'); 