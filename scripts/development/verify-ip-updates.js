const fs = require('fs');
const path = require('path');

const OLD_IP = '192.168.1.96';
const NEW_IP = '172.20.10.11';

function searchInFile(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');
        const matches = [];
        
        lines.forEach((line, index) => {
            if (line.includes(OLD_IP)) {
                matches.push({
                    line: index + 1,
                    content: line.trim()
                });
            }
        });
        
        return matches;
    } catch (error) {
        return [];
    }
}

function scanDirectory(dir) {
    const results = [];
    
    try {
        const items = fs.readdirSync(dir);
        
        for (const item of items) {
            const fullPath = path.join(dir, item);
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory()) {
                // Skip node_modules and .git
                if (item !== 'node_modules' && item !== '.git' && !item.startsWith('.')) {
                    results.push(...scanDirectory(fullPath));
                }
            } else if (stat.isFile()) {
                // Check common file types
                const ext = path.extname(item).toLowerCase();
                if (['.js', '.ts', '.tsx', '.php', '.json', '.md', '.txt', '.env'].includes(ext)) {
                    const matches = searchInFile(fullPath);
                    if (matches.length > 0) {
                        results.push({
                            file: fullPath,
                            matches
                        });
                    }
                }
            }
        }
    } catch (error) {
        // Skip directories we can't access
    }
    
    return results;
}

console.log('🔍 Verifying IP Address Updates\n');
console.log(`Old IP: ${OLD_IP}`);
console.log(`New IP: ${NEW_IP}\n`);

const results = scanDirectory('.');

if (results.length === 0) {
    console.log('✅ All files have been updated successfully!');
    console.log('No instances of the old IP address found.');
} else {
    console.log('❌ Found files still containing the old IP address:\n');
    
    results.forEach(result => {
        console.log(`📁 ${result.file}:`);
        result.matches.forEach(match => {
            console.log(`   Line ${match.line}: ${match.content}`);
        });
        console.log('');
    });
    
    console.log(`Total files with old IP: ${results.length}`);
}

// Also check for the new IP to confirm it's being used
console.log('\n🔍 Checking for new IP usage...');
const newIpResults = scanDirectory('.');
const newIpFiles = newIpResults.filter(result => 
    result.matches.some(match => match.content.includes(NEW_IP))
);

console.log(`✅ Files using new IP (${NEW_IP}): ${newIpFiles.length}`); 