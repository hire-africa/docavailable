const fs = require('fs');
const path = require('path');

// Emoji to icon mapping
const emojiToIcon = {
  '👤': 'user',
  '📅': 'calendar',
  '📞': 'phone',
  '❤️': 'heart',
  '🔄': 'refresh',
  '❌': 'times',
  '✅': 'check',
  '🔍': 'search',
  '➡️': 'chevronRight',
  '⋯': 'more',
  '⬇️': 'download',
  '🗑️': 'delete',
  '✉️': 'email',
  '👁️': 'eye',
  '🔔': 'bell',
  '❓': 'questionCircle',
  '📶': 'wifi',
  '🚪': 'signOut',
  '⚠️': 'exclamationTriangle',
  'ℹ️': 'infoCircle',
  '💬': 'message',
  '📹': 'video',
  '📍': 'mapMarker',
  '⬅️': 'arrowLeft',
  '📄': 'file',
  '📤': 'upload',
  '💾': 'save',
  '💰': 'money',
  '🏦': 'bank',
  '📱': 'mobile',
  '🎓': 'graduationCap',
  '📜': 'certificate',
  '🛡️': 'shield',
  '🆔': 'idCard',
  '📷': 'camera',
  '☑️': 'checkSquare',
  '☐': 'square',
  '🚑': 'ambulance',
  '💳': 'creditCard',
  '⚙️': 'cog',
  '❓': 'questionCircle',
  '📶': 'wifi',
  '🚪': 'signOut',
  '☰': 'menu',
  '❌': 'close',
  '➕': 'plus',
  '➖': 'minus',
  '⚠️': 'warning',
  'ℹ️': 'info',
  '📍': 'location',
  '⏰': 'time',
  '💬': 'message',
  '📞': 'voice',
  '📄': 'text',
  '🟢': 'online',
  '🔴': 'offline',
  '⏳': 'pending',
  '⏰': 'expired',
  '📥': 'export',
  '🗑️': 'delete',
  '⬅️': 'back',
  '➡️': 'forward',
  '⬆️': 'up',
  '⬇️': 'down',
  '◀️': 'left',
  '▶️': 'right'
};

function replaceEmojisWithIcons(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Replace emoji text patterns with Icon components
    for (const [emoji, iconName] of Object.entries(emojiToIcon)) {
      const emojiPattern = new RegExp(`<Text style=\\{[^}]*\\}>${emoji}</Text>`, 'g');
      const replacement = `<Icon name="${iconName}" size={20} color="#666" />`;
      
      if (content.match(emojiPattern)) {
        content = content.replace(emojiPattern, replacement);
        modified = true;
        console.log(`Replaced ${emoji} with ${iconName} icon`);
      }
    }

    // Replace emoji in View components
    for (const [emoji, iconName] of Object.entries(emojiToIcon)) {
      const emojiPattern = new RegExp(`<View[^>]*>\\s*<Text[^>]*>${emoji}</Text>\\s*</View>`, 'g');
      const replacement = `<Icon name="${iconName}" size={20} color="#666" />`;
      
      if (content.match(emojiPattern)) {
        content = content.replace(emojiPattern, replacement);
        modified = true;
        console.log(`Replaced ${emoji} in View with ${iconName} icon`);
      }
    }

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Updated ${filePath}`);
    } else {
      console.log(`No changes needed for ${filePath}`);
    }
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
  }
}

// Process the patient dashboard file
const dashboardPath = path.join(__dirname, '../app/patient-dashboard.tsx');
replaceEmojisWithIcons(dashboardPath);

console.log('🎉 Emoji replacement completed!'); 