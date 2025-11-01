const fs = require('fs');
const path = require('path');

const gradlePath = path.join(__dirname, '..', 'android', 'gradle.properties');

console.log('[fix-gradle-props] Checking gradle.properties...');

if (fs.existsSync(gradlePath)) {
  let gradleProps = fs.readFileSync(gradlePath, 'utf8');
  
  // Replace any existing newArchEnabled=true with false
  gradleProps = gradleProps.replace(/newArchEnabled\s*=\s*true/g, 'newArchEnabled=false');
  
  // If newArchEnabled doesn't exist at all, add it
  if (!gradleProps.includes('newArchEnabled=false')) {
    gradleProps += '\nnewArchEnabled=false\n';
  }
  
  fs.writeFileSync(gradlePath, gradleProps, 'utf8');
  console.log('✅ Forced newArchEnabled=false in gradle.properties');
} else {
  console.warn('⚠️ gradle.properties not found at:', gradlePath);
}
