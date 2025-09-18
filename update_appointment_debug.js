const fs = require('fs');

// Read the file
const filePath = 'app/chat/[appointmentId].tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Add debugging to appointment type loading
const oldAppointmentType = `              // Set appointment type for call button logic
              if (chatInfoData.appointment_type) {
                setAppointmentType(chatInfoData.appointment_type);
              }`;

const newAppointmentType = `              // Set appointment type for call button logic
              console.log('📅 [ChatInfo] Loading appointment type:', {
                appointment_type: chatInfoData.appointment_type,
                status: chatInfoData.status,
                appointment_id: chatInfoData.appointment_id
              });
              if (chatInfoData.appointment_type) {
                setAppointmentType(chatInfoData.appointment_type);
                console.log('✅ [ChatInfo] Appointment type set:', chatInfoData.appointment_type);
              } else {
                console.log('⚠️ [ChatInfo] No appointment type found in chat info');
              }`;

content = content.replace(oldAppointmentType, newAppointmentType);

// Write back to file
fs.writeFileSync(filePath, content);
console.log('Updated debugging in appointment type loading');
