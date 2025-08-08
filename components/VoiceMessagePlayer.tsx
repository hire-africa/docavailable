import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { toImageUrl } from '../services/url';

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
  // Debug profile picture URL
      // console.log('VoiceMessagePlayer Debug:', {
    //   profilePictureUrl,
    //   isOwnMessage,
    //   hasUrl: !!profilePictureUrl
    // });

  const getImageUrl = (uri: string) => toImageUrl(uri) as string;

  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);

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
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: audioUri },
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