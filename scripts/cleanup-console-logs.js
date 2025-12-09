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

// Function to count console statements in a file
function countConsoleStatements(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const consoleLogMatches = content.match(/console\.log/g) || [];
    const consoleErrorMatches = content.match(/console\.error/g) || [];
    const consoleWarnMatches = content.match(/console\.warn/g) || [];
    
    return {
      file: filePath,
      consoleLog: consoleLogMatches.length,
      consoleError: consoleErrorMatches.length,
      consoleWarn: consoleWarnMatches.length,
      total: consoleLogMatches.length + consoleErrorMatches.length + consoleWarnMatches.length
    };
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error.message);
    return { file: filePath, consoleLog: 0, consoleError: 0, consoleWarn: 0, total: 0 };
  }
}

// Main execution
console.log('🔍 Scanning for console statements in .tsx files...\n');

const tsxFiles = findTsxFiles('.');
const results = tsxFiles.map(countConsoleStatements);

// Filter files with console statements
const filesWithConsole = results.filter(result => result.total > 0);

// Sort by total console statements (descending)
filesWithConsole.sort((a, b) => b.total - a.total);

console.log('📊 Files with console statements:');
console.log('================================\n');

filesWithConsole.forEach(result => {
  const relativePath = path.relative('.', result.file);
  console.log(`${relativePath}:`);
  console.log(`  console.log: ${result.consoleLog}`);
  console.log(`  console.error: ${result.consoleError}`);
  console.log(`  console.warn: ${result.consoleWarn}`);
  console.log(`  Total: ${result.total}\n`);
});

const totalConsoleStatements = filesWithConsole.reduce((sum, result) => sum + result.total, 0);
console.log(`📈 Total console statements across all files: ${totalConsoleStatements}`);

// Recommendations
console.log('\n💡 Recommendations for EAS build optimization:');
console.log('=============================================');
console.log('1. Comment out or remove excessive console.log statements');
console.log('2. Keep only essential console.error statements for debugging');
console.log('3. Consider using a logging library for production builds');
console.log('4. Use __DEV__ checks for development-only logging');
console.log('5. Consider implementing a custom logger that can be disabled in production');

// Files with high console usage
const highUsageFiles = filesWithConsole.filter(result => result.total > 10);
if (highUsageFiles.length > 0) {
  console.log('\n⚠️  Files with high console usage (>10 statements):');
  highUsageFiles.forEach(result => {
    const relativePath = path.relative('.', result.file);
    console.log(`  - ${relativePath} (${result.total} statements)`);
  });
} 