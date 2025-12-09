import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';

interface MessageReactionProps {
  messageId: string;
  existingReactions?: { emoji: string; userId: number; userName: string }[];
  currentUserId: number;
  onReact: (messageId: string, emoji: string) => void;
  onRemoveReaction: (messageId: string, emoji: string) => void;
}

const QUICK_REACTIONS = ['❤️', '👍', '😂', '😮', '😢', '🙏'];

export const MessageReaction: React.FC<MessageReactionProps> = ({
  messageId,
  existingReactions = [],
  currentUserId,
  onReact,
  onRemoveReaction,
}) => {
  const [showPicker, setShowPicker] = useState(false);

  // Group reactions by emoji
  const groupedReactions = existingReactions.reduce((acc, reaction) => {
    if (!acc[reaction.emoji]) {
      acc[reaction.emoji] = [];
    }
    acc[reaction.emoji].push(reaction);
    return acc;
  }, {} as Record<string, typeof existingReactions>);

  const handleReactionPress = (emoji: string) => {
    const userReacted = groupedReactions[emoji]?.some(r => r.userId === currentUserId);
    
    if (userReacted) {
      onRemoveReaction(messageId, emoji);
    } else {
      onReact(messageId, emoji);
    }
    setShowPicker(false);
  };

  return (
    <>
      {/* Display existing reactions */}
      {Object.keys(groupedReactions).length > 0 && (
        <View style={styles.reactionsContainer}>
          {Object.entries(groupedReactions).map(([emoji, reactions]) => (
            <TouchableOpacity
              key={emoji}
              style={[
                styles.reactionBubble,
                reactions.some(r => r.userId === currentUserId) && styles.reactionBubbleActive
              ]}
              onPress={() => handleReactionPress(emoji)}
            >
              <Text style={styles.reactionEmoji}>{emoji}</Text>
              {reactions.length > 1 && (
                <Text style={styles.reactionCount}>{reactions.length}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Reaction Picker Modal */}
      <Modal
        visible={showPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowPicker(false)}
        >
          <View style={styles.pickerContainer}>
            {QUICK_REACTIONS.map((emoji) => (
              <TouchableOpacity
                key={emoji}
                style={styles.emojiButton}
                onPress={() => handleReactionPress(emoji)}
              >
                <Text style={styles.emojiText}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

export const showReactionPicker = (setShowPicker: (show: boolean) => void) => {
  setShowPicker(true);
};

const styles = StyleSheet.create({
  reactionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
    gap: 4,
  },
  reactionBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  reactionBubbleActive: {
    backgroundColor: '#E3F2FD',
    borderColor: '#4CAF50',
  },
  reactionEmoji: {
    fontSize: 14,
  },
  reactionCount: {
    fontSize: 11,
    color: '#666',
    marginLeft: 4,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 30,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  emojiButton: {
    padding: 12,
    marginHorizontal: 4,
  },
  emojiText: {
    fontSize: 28,
  },
});
