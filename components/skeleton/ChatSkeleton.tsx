import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SkeletonBox } from './SkeletonBox';
import { SkeletonCircle } from './SkeletonCircle';
import { SkeletonText } from './SkeletonText';

interface ChatSkeletonProps {
  messageCount?: number;
}

export const ChatSkeleton: React.FC<ChatSkeletonProps> = ({
  messageCount = 5,
}) => {
  return (
    <View style={styles.container}>
      {/* Header Skeleton */}
      <View style={styles.header}>
        <SkeletonCircle size={40} />
        <View style={styles.headerText}>
          <SkeletonBox width={120} height={16} style={styles.headerTitle} />
          <SkeletonBox width={80} height={12} />
        </View>
        <SkeletonBox width={24} height={24} borderRadius={12} />
      </View>

      {/* Messages Skeleton */}
      <ScrollView style={styles.messagesContainer} showsVerticalScrollIndicator={false}>
        {Array.from({ length: messageCount }, (_, index) => (
          <View
            key={index}
            style={[
              styles.messageContainer,
              index % 3 === 0 ? styles.userMessage : styles.botMessage,
            ]}
          >
            <View
              style={[
                styles.messageBubble,
                index % 3 === 0 ? styles.userBubble : styles.botBubble,
              ]}
            >
              <SkeletonText
                lines={Math.floor(Math.random() * 3) + 1}
                lineHeight={16}
                spacing={4}
                width={Math.random() * 100 + 100}
                lastLineWidth={Math.random() * 60 + 40}
              />
            </View>
            <SkeletonBox
              width={60}
              height={10}
              style={[
                styles.messageTime,
                index % 3 === 0 ? styles.userTime : styles.botTime,
              ]}
            />
          </View>
        ))}
      </ScrollView>

      {/* Input Area Skeleton */}
      <View style={styles.inputContainer}>
        <View style={styles.inputRow}>
          <SkeletonBox width={24} height={24} borderRadius={12} />
          <SkeletonBox width="70%" height={40} borderRadius={20} />
          <SkeletonBox width={40} height={40} borderRadius={20} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E1E9EE',
  },
  headerText: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    marginBottom: 4,
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  messageContainer: {
    marginBottom: 16,
  },
  userMessage: {
    alignItems: 'flex-end',
  },
  botMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  userBubble: {
    backgroundColor: '#E1E9EE',
    borderBottomRightRadius: 4,
  },
  botBubble: {
    backgroundColor: '#F0F0F0',
    borderBottomLeftRadius: 4,
  },
  messageTime: {
    marginTop: 4,
  },
  userTime: {
    alignSelf: 'flex-end',
  },
  botTime: {
    alignSelf: 'flex-start',
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E1E9EE',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
