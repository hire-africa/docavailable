#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Function to recursively find all .tsx files
function findTsxFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !file.includes('node_modules') && !file.includes('.git')) {
      findTsxFiles(filePath, fileList);
    } else if (file.endsWith('.tsx')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

// Function to clean up console statements in a file
function cleanupConsoleStatements(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Comment out console.log statements (but not console.error)
    const consoleLogRegex = /(\s*)(console\.log\s*\([^)]*\);?)/g;
    const newContent = content.replace(consoleLogRegex, (match, whitespace, consoleStatement) => {
      // Skip if it's already commented
      if (match.trim().startsWith('//')) {
        return match;
      }
      modified = true;
      return `${whitespace}// ${consoleStatement}`;
    });
    
    if (modified) {
      fs.writeFileSync(filePath, newContent, 'utf8');
      console.log(`✅ Cleaned up console statements in: ${path.relative('.', filePath)}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Error processing file ${filePath}:`, error.message);
    return false;
  }
}

// Main execution
console.log('🧹 Starting automated console cleanup...\n');

const tsxFiles = findTsxFiles('.');
let cleanedFiles = 0;

tsxFiles.forEach(filePath => {
  if (cleanupConsoleStatements(filePath)) {
    cleanedFiles++;
  }
});

console.log(`\n📊 Cleanup Summary:`);
console.log(`Total files processed: ${tsxFiles.length}`);
console.log(`Files cleaned: ${cleanedFiles}`);
console.log(`\n💡 Console.log statements have been commented out while preserving console.error for debugging.`);
console.log(`\n🔄 You can now run your EAS build with reduced console overhead.`); 