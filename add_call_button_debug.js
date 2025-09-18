const fs = require('fs');

// Read the file
const filePath = 'app/chat/[appointmentId].tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Add debugging before the call button renders
const oldCallButton = '          {/* Audio Call Button - Only patients can initiate calls */}\n          {user?.user_type === \'patient\' && (';

const newCallButton = `          {/* Audio Call Button - Only patients can initiate calls */}
          {user?.user_type === 'patient' && (() => {
            const callEnabled = isCallEnabled();
            const buttonEnabled = callEnabled && webrtcReady && !showIncomingCall;
            console.log('🎯 [CallButton] Render state:', {
              userType: user?.user_type,
              callEnabled,
              webrtcReady,
              showIncomingCall,
              buttonEnabled,
              appointmentType,
              isTextSession
            });
            return (
              <TouchableOpacity`;

content = content.replace(oldCallButton, newCallButton);

// Also need to close the function call
const oldTouchableOpacity = `            <TouchableOpacity 
              style={{ 
                padding: 8,
                opacity: (isCallEnabled() && webrtcReady && !showIncomingCall) ? 1 : 0.3
              }}`;

const newTouchableOpacity = `              <TouchableOpacity 
                style={{ 
                  padding: 8,
                  opacity: buttonEnabled ? 1 : 0.3
                }}`;

content = content.replace(oldTouchableOpacity, newTouchableOpacity);

// Update the disabled prop
const oldDisabled = `              disabled={!isCallEnabled() || !webrtcReady || showIncomingCall}`;

const newDisabled = `                disabled={!buttonEnabled}`;

content = content.replace(oldDisabled, newDisabled);

// Update the onPress condition
const oldOnPress = `              onPress={() => {
                if (isCallEnabled() && webrtcReady) {`;

const newOnPress = `                onPress={() => {
                  if (buttonEnabled) {`;

content = content.replace(oldOnPress, newOnPress);

// Update the else conditions
const oldElse1 = `                } else if (!webrtcReady) {`;

const newElse1 = `                  } else if (!webrtcReady) {`;

content = content.replace(oldElse1, newElse1);

const oldElse2 = `                } else {`;

const newElse2 = `                  } else {`;

content = content.replace(oldElse2, newElse2);

// Update the closing of the function
const oldClosing = `              }}
            >
              <Icon name="voice" size={24} color={(isCallEnabled() && webrtcReady && !showIncomingCall) ? "#4CAF50" : "#999"} />
            </TouchableOpacity>
          )}`;

const newClosing = `                }}
              >
                <Icon name="voice" size={24} color={buttonEnabled ? "#4CAF50" : "#999"} />
              </TouchableOpacity>
            );
          })()}`;

content = content.replace(oldClosing, newClosing);

// Write back to file
fs.writeFileSync(filePath, content);
console.log('Added call button render debugging');