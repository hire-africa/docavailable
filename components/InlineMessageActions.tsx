import { FontAwesome } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    Animated,
    StyleSheet,
    TouchableOpacity
} from 'react-native';

interface InlineMessageActionsProps {
  onAction: (action: string) => void;
  isMyMessage: boolean;
  visible: boolean;
}

export default function InlineMessageActions({ 
  onAction, 
  isMyMessage, 
  visible 
}: InlineMessageActionsProps) {
  const [animation] = useState(new Animated.Value(0));

  React.useEffect(() => {
    Animated.spring(animation, {
      toValue: visible ? 1 : 0,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
  }, [visible]);

  if (!visible) return null;

  const actions = [
    {
      id: 'copy',
      icon: 'copy',
      label: 'Copy',
      color: '#4CAF50'
    },
    {
      id: 'reply',
      icon: 'reply',
      label: 'Reply',
      color: '#2196F3'
    },
    {
      id: 'forward',
      icon: 'share',
      label: 'Forward',
      color: '#FF9800'
    }
  ];

  if (isMyMessage) {
    actions.push({
      id: 'delete',
      icon: 'trash',
      label: 'Delete',
      color: '#F44336'
    });
  }

  return (
    <Animated.View 
      style={[
        styles.container,
        {
          opacity: animation,
          transform: [{
            scale: animation.interpolate({
              inputRange: [0, 1],
              outputRange: [0.8, 1],
            })
          }]
        }
      ]}
    >
      {actions.map((action) => (
        <TouchableOpacity
          key={action.id}
          style={[styles.actionButton, { backgroundColor: action.color }]}
          onPress={() => onAction(action.id)}
        >
          <FontAwesome name={action.icon as any} size={14} color="white" />
        </TouchableOpacity>
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 2,
  },
}); 