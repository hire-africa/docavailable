const fs = require('fs');
const path = require('path');

console.log('🔧 Replacing all vector-icons imports...');

// Function to recursively find all TypeScript/JavaScript files
function findFiles(dir, extensions = ['.tsx', '.ts', '.js', '.jsx']) {
  let results = [];
  const list = fs.readdirSync(dir);
  
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat && stat.isDirectory()) {
      // Skip node_modules and .git
      if (file !== 'node_modules' && file !== '.git' && file !== '.expo') {
        results = results.concat(findFiles(filePath, extensions));
      }
    } else {
      if (extensions.some(ext => file.endsWith(ext))) {
        results.push(filePath);
      }
    }
  });
  
  return results;
}

// Function to replace vector-icons imports
function replaceVectorIconsImports(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Replace @expo/vector-icons imports
    if (content.includes('@expo/vector-icons')) {
      console.log(`📝 Processing: ${filePath}`);
      
      // Replace import statements
      content = content.replace(
        /import\s+\{\s*([^}]+)\s*\}\s+from\s+['"]@expo\/vector-icons['"];?/g,
        (match, imports) => {
          modified = true;
          const iconNames = imports.split(',').map(s => s.trim());
          return `import { SimpleIcons } from '../components/SimpleIcons';`;
        }
      );
      
      // Replace direct imports like: import { SimpleIcons } from '../components/SimpleIcons';
      content = content.replace(
        /import\s+([^;]+)\s+from\s+['"]@expo\/vector-icons['"];?/g,
        (match, imports) => {
          modified = true;
          return `import { SimpleIcons } from '../components/SimpleIcons';`;
        }
      );
      
      // Replace usage of FontAwesome, Ionicons, etc.
      content = content.replace(
        /<FontAwesome\s+name="([^"]+)"([^>]*)>/g,
        (match, iconName, props) => {
          modified = true;
          // Handle hyphenated names with bracket notation
          if (iconName.includes('-')) {
            return `<SimpleIcons.FontAwesome['${iconName}'] />`;
          }
          return `<SimpleIcons.FontAwesome.${iconName} />`;
        }
      );
      
      content = content.replace(
        /<Ionicons\s+name="([^"]+)"([^>]*)>/g,
        (match, iconName, props) => {
          modified = true;
          // Handle hyphenated names with bracket notation
          if (iconName.includes('-')) {
            return `<SimpleIcons.Ionicons['${iconName}'] />`;
          }
          return `<SimpleIcons.Ionicons.${iconName} />`;
        }
      );
      
      content = content.replace(
        /<MaterialIcons\s+name="([^"]+)"([^>]*)>/g,
        (match, iconName, props) => {
          modified = true;
          // Handle hyphenated names with bracket notation
          if (iconName.includes('-')) {
            return `<SimpleIcons.MaterialIcons['${iconName}'] />`;
          }
          return `<SimpleIcons.MaterialIcons.${iconName} />`;
        }
      );
      
      if (modified) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ Updated: ${filePath}`);
      }
    }
  } catch (error) {
    console.log(`❌ Error processing ${filePath}:`, error.message);
  }
}

// Find all TypeScript/JavaScript files
const files = findFiles(__dirname + '/..');
console.log(`Found ${files.length} files to process`);

// Process each file
files.forEach(replaceVectorIconsImports);

console.log('🔧 Vector-icons replacement completed!'); 