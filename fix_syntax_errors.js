const fs = require('fs');

// Read the file
const filePath = 'app/chat/[appointmentId].tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Fix the duplicate TouchableOpacity
content = content.replace(
  '              <TouchableOpacity\n              <TouchableOpacity',
  '              <TouchableOpacity'
);

// Fix the missing closing brace in the if statement
content = content.replace(
  '                  if (buttonEnabled) {\n                  console.log',
  '                  if (buttonEnabled) {\n                    console.log'
);

// Write back to file
fs.writeFileSync(filePath, content);
console.log('Fixed syntax errors');
