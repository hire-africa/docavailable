const fs = require('fs');

// Read the file
const filePath = 'app/chat/[appointmentId].tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Update the isCallEnabled function debugging
const oldDebug = `    console.log('🔍 [isCallEnabled] Debug:', {
      isTextSession,
      appointmentType,
      enabled,
      webrtcReady,
      showIncomingCall
    });`;

const newDebug = `    console.log('🔍 [isCallEnabled] Debug:', {
      isTextSession,
      appointmentType,
      enabled,
      webrtcReady,
      showIncomingCall,
      userType: user?.user_type,
      appointmentId,
      chatInfo: chatInfo ? {
        appointment_type: chatInfo.appointment_type,
        status: chatInfo.status
      } : null
    });`;

content = content.replace(oldDebug, newDebug);

// Write back to file
fs.writeFileSync(filePath, content);
console.log('Updated debugging in isCallEnabled function');
