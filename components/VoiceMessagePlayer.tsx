import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { environment } from '../config/environment';

interface VoiceMessagePlayerProps {
  audioUri: string;
  isOwnMessage?: boolean;
  timestamp?: string;
  deliveryStatus?: 'sending' | 'sent' | 'delivered' | 'read';
  profilePictureUrl?: string;
}

export default function VoiceMessagePlayer({ 
  audioUri, 
  isOwnMessage = false, 
  timestamp,
  deliveryStatus = 'sent',
  profilePictureUrl
}: VoiceMessagePlayerProps) {
  // Debug: Log the audio URI we receive
  console.log('🎵 VoiceMessagePlayer received audioUri:', audioUri);
  
  // Debug profile picture URL
      // console.log('VoiceMessagePlayer Debug:', {
    //   profilePictureUrl,
    //   isOwnMessage,
    //   hasUrl: !!profilePictureUrl
    // });

  const getImageUrl = (uri: string) => {
    if (uri.startsWith('http')) {
      return uri;
    }
    // Use the new image serving route instead of direct storage access
    return `https://docavailable-3vbdv.ondigitalocean.app/api/images/${uri}`;
  };

  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    loadAudio();
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [audioUri]);

  const loadAudio = async () => {
    try {
      setIsLoading(true);
      setLoadError(null);
      
      // Check if audioUri is valid
      if (!audioUri || audioUri.trim() === '') {
        console.error('🎵 VoiceMessagePlayer: No audio URI provided');
        setLoadError('No audio file available');
        setIsLoading(false);
        return;
      }
      
      // Use the audio URI directly - it should already be a complete URL from the server
      let audioUrl = audioUri;
      
      // If it's a relative path, use the WebRTC chat server for file serving
      if (!audioUrl.startsWith('http') && !audioUrl.startsWith('file://')) {
        // If it already starts with /api/audio/, just prepend the server URL
        if (audioUrl.startsWith('/api/audio/')) {
          audioUrl = `${environment.WEBRTC_CHAT_SERVER_URL}${audioUrl}`;
        } else {
          // If it's a relative path without /api/audio/, add the prefix
          const cleanPath = audioUrl.startsWith('/') ? audioUrl.substring(1) : audioUrl;
          audioUrl = `${environment.WEBRTC_CHAT_SERVER_URL}/api/audio/${cleanPath}`;
        }
      }

      // Only handle local file:// URLs if they exist
      if (audioUrl.startsWith('/')) {
        audioUrl = `file://${audioUrl}`;
      }
      
      console.log('🎵 Loading audio URL:', audioUrl);
      console.log('🎵 Original audioUri:', audioUri);
      
      // First, check if the file exists by making a HEAD request for HTTP URLs
      if (audioUrl.startsWith('http')) {
        try {
          const headResponse = await fetch(audioUrl, { method: 'HEAD' });
          if (!headResponse.ok) {
            if (headResponse.status === 404) {
              console.warn('🎵 Audio file not found (404):', audioUrl);
              setLoadError('Voice message file not found - server configuration issue');
              setIsLoading(false);
              return;
            } else if (headResponse.status === 403) {
              console.warn('🎵 Audio file access denied (403):', audioUrl);
              setLoadError('Voice message is not accessible');
              setIsLoading(false);
              return;
            } else {
              console.warn('🎵 Audio file check failed:', headResponse.status, headResponse.statusText);
            }
          }
        } catch (headError) {
          console.warn('🎵 Could not check audio file availability:', headError);
          // Continue with loading attempt anyway
        }
      }
      
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: false }
      );
      
      setSound(newSound);
      
      // Get duration
      const status = await newSound.getStatusAsync();
      if (status.isLoaded) {
        setDuration(status.durationMillis || 0);
      }
      
      // Set up status update
      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          setIsPlaying(status.isPlaying);
          setPosition(status.positionMillis || 0);
        }
      });
      
    } catch (error) {
      console.error('Error loading audio:', error);
      
      // Provide more specific error messages
      if (error.message?.includes('404') || error.message?.includes('not found')) {
        setLoadError('Voice message file not found');
      } else if (error.message?.includes('network') || error.message?.includes('timeout')) {
        setLoadError('Network error loading voice message');
      } else if (error.message?.includes('format') || error.message?.includes('invalid')) {
        setLoadError('Invalid audio format');
      } else {
        setLoadError(`Failed to load audio: ${error.message || 'Unknown error'}`);
      }
      
      // For iOS, try alternative URL format if first attempt fails
      if (Platform.OS === 'ios' && !audioUri.startsWith('file://')) {
        try {
          console.log('🔄 Retrying audio with alternative URL format...');
          // Try with different encoding
          const alternativeUrl = encodeURI(audioUri);
          
          const { sound: newSound } = await Audio.Sound.createAsync(
            { uri: alternativeUrl },
            { shouldPlay: false }
          );
          
          setSound(newSound);
          setLoadError(null); // Clear error on successful retry
          
          const status = await newSound.getStatusAsync();
          if (status.isLoaded) {
            setDuration(status.durationMillis || 0);
          }
          
          newSound.setOnPlaybackStatusUpdate((status) => {
            if (status.isLoaded) {
              setIsPlaying(status.isPlaying);
              setPosition(status.positionMillis || 0);
            }
          });
        } catch (retryError) {
          console.error('Error on audio retry:', retryError);
          setLoadError(`Failed to load audio after retry: ${retryError.message || 'Unknown error'}`);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const playPause = async () => {
    if (!sound) return;
    
    try {
      if (isPlaying) {
        await sound.pauseAsync();
      } else {
        // If audio has finished, restart from beginning
        if (position >= duration && duration > 0) {
          await sound.setPositionAsync(0);
        }
        await sound.playAsync();
      }
    } catch (error) {
      console.error('Error playing/pausing audio:', error);
    }
  };

  const formatTime = (milliseconds: number) => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };



  const renderDeliveryStatus = () => {
    if (isOwnMessage) {
      switch (deliveryStatus) {
        case 'sending':
          return <ActivityIndicator size={12} color="#fff" />;
        case 'sent':
          return <Ionicons name="checkmark" size={12} color="#fff" />;
        case 'delivered':
          return <Ionicons name="checkmark-done" size={12} color="#fff" />;
        case 'read':
          return <Ionicons name="checkmark-done" size={12} color="#4CAF50" />;
        default:
          return null;
      }
    }
    return null;
  };

  if (isLoading) {
    return (
      <View style={[styles.container, isOwnMessage ? styles.ownMessage : styles.otherMessage]}>
        <ActivityIndicator size="small" color={isOwnMessage ? "#fff" : "#4CAF50"} />
        <Text style={[styles.loadingText, { color: isOwnMessage ? "#fff" : "#666" }]}>
          Loading voice message...
        </Text>
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={[styles.container, isOwnMessage ? styles.ownMessage : styles.otherMessage]}>
        <View style={styles.profilePictureContainer}>
          {profilePictureUrl ? (
            <Image
              source={{ uri: profilePictureUrl }}
              style={styles.profilePicture}
              onError={() => {}}
            />
          ) : (
            <View style={styles.profilePictureFallback}>
              <Ionicons name="person" size={16} color={isOwnMessage ? "#fff" : "#666"} />
            </View>
          )}
        </View>
        <View style={styles.contentContainer}>
          <View style={styles.topRow}>
            <View style={styles.microphoneContainer}>
              <Ionicons
                name="mic"
                size={18}
                color={isOwnMessage ? "#fff" : "#666"}
              />
            </View>
            <View style={styles.playButton}>
              <Ionicons
                name="alert-circle"
                size={18}
                color={isOwnMessage ? "#fff" : "#FF3B30"}
              />
            </View>
            <Text style={[styles.errorText, { color: isOwnMessage ? "#fff" : "#FF3B30" }]}>
              {loadError || 'Voice message unavailable'}
            </Text>
          </View>
          {timestamp && (
            <Text style={[styles.timestampText, { color: isOwnMessage ? "#fff" : "#666" }]}>
              {timestamp}
            </Text>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, isOwnMessage ? styles.ownMessage : styles.otherMessage]}>
      {/* Profile Picture */}
      <View style={styles.profilePictureContainer}>
                 {profilePictureUrl ? (
           <Image
             source={{ uri: profilePictureUrl }}
             style={styles.profilePicture}
             onError={() => {
               // console.log('VoiceMessagePlayer: Profile picture failed to load, showing fallback');
             }}
             onLoad={() => {
               // console.log('VoiceMessagePlayer: Profile picture loaded successfully:', profilePictureUrl);
             }}
           />
         ) : (
          <View style={styles.profilePictureFallback}>
            <Ionicons name="person" size={16} color={isOwnMessage ? "#fff" : "#666"} />
          </View>
        )}
      </View>

      {/* Main Content Container */}
      <View style={styles.contentContainer}>
        {/* Top Row: Microphone, Play Button, Waveform */}
        <View style={styles.topRow}>
          {/* Microphone Icon */}
          <View style={styles.microphoneContainer}>
            <Ionicons
              name="mic"
              size={18}
              color={isOwnMessage ? "#fff" : "#666"}
            />
          </View>

          {/* Play Button */}
          <TouchableOpacity
            onPress={playPause}
            style={styles.playButton}
            disabled={!sound}
          >
            <Ionicons
              name={isPlaying ? "pause" : "play"}
              size={18}
              color={isOwnMessage ? "#fff" : "#4CAF50"}
            />
          </TouchableOpacity>
          
                                                                 {/* Static Waveform */}
             <View style={styles.waveformContainer}>
               <View style={styles.waveform}>
                 {[0.4, 0.6, 0.8, 0.5, 0.9, 0.3, 0.7, 0.6, 0.8, 0.4, 0.7, 0.5, 0.9, 0.6, 0.8, 0.4, 0.7, 0.5, 0.8, 0.6].map((height, i) => (
                   <View
                     key={i}
                     style={[
                       styles.waveformBar,
                       {
                         height: `${height * 100}%`,
                         backgroundColor: isOwnMessage ? "#fff" : "#666"
                       }
                     ]}
                   />
                 ))}
               </View>
             </View>
        </View>

        {/* Bottom Row: Duration and Timestamp */}
        <View style={styles.bottomRow}>
          {/* Duration */}
          <Text style={[styles.durationText, { color: isOwnMessage ? "#fff" : "#666" }]}>
            {formatTime(position)}
          </Text>

          {/* Timestamp and Delivery Status */}
          <View style={styles.timestampContainer}>
            {timestamp && (
              <Text style={[styles.timestampText, { color: isOwnMessage ? "#fff" : "#666" }]}>
                {timestamp}
              </Text>
            )}
            {renderDeliveryStatus()}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    maxWidth: '85%',
    minHeight: 70,
  },
  ownMessage: {
    backgroundColor: '#4CAF50', // Match the bubble green color
    alignSelf: 'flex-end',
  },
  otherMessage: {
    backgroundColor: '#f0f0f0',
    alignSelf: 'flex-start',
  },
  profilePictureContainer: {
    marginRight: 8,
  },
  profilePicture: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  profilePictureFallback: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  microphoneContainer: {
    marginRight: 8,
    opacity: 0.8,
  },
  playButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  waveformContainer: {
    flex: 1,
    height: 32,
    justifyContent: 'center',
    position: 'relative',
    marginRight: 8,
  },
  waveform: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 20,
    gap: 2,
  },
  waveformBar: {
    width: 2,
    borderRadius: 1,
    minHeight: 4,
  },

  durationText: {
    fontSize: 11,
    opacity: 0.8,
  },
  timestampContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timestampText: {
    fontSize: 10,
    opacity: 0.7,
  },
  loadingText: {
    fontSize: 14,
    marginLeft: 12,
  },
  errorText: {
    fontSize: 12,
    marginLeft: 8,
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 6,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    justifyContent: 'space-between',
  },
}); 