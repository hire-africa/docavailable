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

// Function to fix SimpleIcons usage in a file
function fixSimpleIconsInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Fix import paths
    content = content.replace(
      /import\s+\{\s*SimpleIcons\s*\}\s+from\s+['"]\.\.\/components\/SimpleIcons['"]/g,
      "import { SimpleIcons } from '../../components/SimpleIcons'"
    );
    
    // Fix SimpleIcons.FontAwesome.hyphenated-name to SimpleIcons.FontAwesome['hyphenated-name']
    content = content.replace(
      /SimpleIcons\.FontAwesome\.([a-zA-Z-]+)/g,
      (match, propName) => {
        if (propName.includes('-')) {
          modified = true;
          return `SimpleIcons.FontAwesome['${propName}']`;
        }
        return match;
      }
    );
    
    // Fix SimpleIcons.Ionicons.hyphenated-name to SimpleIcons.Ionicons['hyphenated-name']
    content = content.replace(
      /SimpleIcons\.Ionicons\.([a-zA-Z-]+)/g,
      (match, propName) => {
        if (propName.includes('-')) {
          modified = true;
          return `SimpleIcons.Ionicons['${propName}']`;
        }
        return match;
      }
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

console.log('SimpleIcons fixes completed!'); 