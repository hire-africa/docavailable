#!/usr/bin/env node

/**
 * Script to remove debug sections from chat files
 */

const fs = require('fs');
const path = require('path');

const filesToClean = [
  'app/chat/[appointmentId].tsx',
  'components/InstantSessionIntegration.tsx',
  'components/InstantSessionChatIntegration.tsx'
];

function removeDebugSections(content) {
  // Remove debug info sections
  content = content.replace(/\s*{\/\* Debug Info for Instant Sessions \*\/}[\s\S]*?^\s*}\)\s*$/gm, '');
  
  // Remove debug info sections with different patterns
  content = content.replace(/\s*{\/\* Debug info - remove in production \*\/}[\s\S]*?^\s*}\)\s*$/gm, '');
  
  // Remove debug info sections with __DEV__ checks
  content = content.replace(/\s*{__DEV__ && \([\s\S]*?^\s*}\)\s*$/gm, '');
  
  // Remove debug styles
  content = content.replace(/\s*debug[A-Za-z]*:\s*{[^}]*},?\s*/g, '');
  
  // Remove console.log statements (keep only error logs)
  content = content.replace(/^\s*console\.log\([^;]*\);\s*$/gm, '');
  
  // Remove debug comments
  content = content.replace(/\s*\/\/ Debug:.*$/gm, '');
  content = content.replace(/\s*\/\/ Debug logging.*$/gm, '');
  
  return content;
}

function cleanFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found: ${filePath}`);
      return;
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    const cleanedContent = removeDebugSections(content);
    
    if (content !== cleanedContent) {
      fs.writeFileSync(filePath, cleanedContent, 'utf8');
      console.log(`✅ Cleaned: ${filePath}`);
    } else {
      console.log(`ℹ️  No changes needed: ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ Error cleaning ${filePath}:`, error.message);
  }
}

console.log('🧹 Cleaning debug sections from chat files...\n');

filesToClean.forEach(cleanFile);

console.log('\n✅ Debug cleanup complete!');
