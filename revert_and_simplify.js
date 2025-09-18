const fs = require('fs');

// Read the file
const filePath = 'app/chat/[appointmentId].tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Revert the complex debugging and use a simpler approach
const oldComplexDebug = `          {/* Audio Call Button - Only patients can initiate calls */}
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
              <TouchableOpacity 
                style={{ 
                  padding: 8,
                  opacity: buttonEnabled ? 1 : 0.3
                }}
                onPress={() => {
                  if (buttonEnabled) {
                    console.log('📞 Patient call button pressed:', {
                      appointmentId,
                      currentUserId,
                      isDoctor: user?.user_type === 'doctor',
                      userType: user?.user_type
                    });
                    
                    // Clear any pending offer before starting new call
                    (global as any).pendingOffer = null;
                    // Clear incoming call flag for outgoing calls
                    (global as any).isIncomingCall = false;
                    
                    // Initialize audio call
                    // AudioCallService is already imported as audioCallService
                    
                    setShowAudioCallModal(true);
                  } else if (!webrtcReady) {
                    console.log('Call Not Ready: WebRTC is not ready yet. Please wait a moment.');
                    // Call not ready - logged to console only
                  } else {
                    console.log(
                      isTextSession 
                        ? 'Call Not Available: Call feature is not available for this session type.'
                        : 'Call Not Available: Call feature is only available for audio appointments.'
                    );
                    // Call not available - logged to console only
                  }
                }}
              >
                <Icon name="voice" size={24} color={buttonEnabled ? "#4CAF50" : "#999"} />
              </TouchableOpacity>
            );
          })()}`;

const newSimpleDebug = `          {/* Audio Call Button - Only patients can initiate calls */}
          {user?.user_type === 'patient' && (
            (() => {
              console.log('🎯 [CallButton] Render state:', {
                userType: user?.user_type,
                callEnabled: isCallEnabled(),
                webrtcReady,
                showIncomingCall,
                appointmentType,
                isTextSession
              });
              return null;
            })(),
            <TouchableOpacity 
              style={{ 
                padding: 8,
                opacity: (isCallEnabled() && webrtcReady && !showIncomingCall) ? 1 : 0.3
              }}
              onPress={() => {
                if (isCallEnabled() && webrtcReady) {
                  console.log('📞 Patient call button pressed:', {
                    appointmentId,
                    currentUserId,
                    isDoctor: user?.user_type === 'doctor',
                    userType: user?.user_type
                  });
                  
                  // Clear any pending offer before starting new call
                  (global as any).pendingOffer = null;
                  // Clear incoming call flag for outgoing calls
                  (global as any).isIncomingCall = false;
                  
                  // Initialize audio call
                  // AudioCallService is already imported as audioCallService
                  
                  setShowAudioCallModal(true);
                } else if (!webrtcReady) {
                  console.log('Call Not Ready: WebRTC is not ready yet. Please wait a moment.');
                  // Call not ready - logged to console only
                } else {
                  console.log(
                    isTextSession 
                      ? 'Call Not Available: Call feature is not available for this session type.'
                      : 'Call Not Available: Call feature is only available for audio appointments.'
                  );
                  // Call not available - logged to console only
                }
              }}
              disabled={!isCallEnabled() || !webrtcReady || showIncomingCall}
            >
              <Icon name="voice" size={24} color={(isCallEnabled() && webrtcReady && !showIncomingCall) ? "#4CAF50" : "#999"} />
            </TouchableOpacity>
          )}`;

content = content.replace(oldComplexDebug, newSimpleDebug);

// Write back to file
fs.writeFileSync(filePath, content);
console.log('Reverted to simpler debugging approach');
