import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import appTourService, { TourStep } from '../services/appTourService';
import Icon from './Icon';

const { width, height } = Dimensions.get('window');

interface AppTourProps {
  visible: boolean;
  userType: 'patient' | 'doctor';
  onComplete: () => void;
  onSkip?: () => void;
  elementRefs?: Record<string, React.RefObject<View>>; // Refs to elements to highlight
  onTabChange?: (tab: string) => void; // Callback to switch tabs during tour
}

export default function AppTour({
  visible,
  userType,
  onComplete,
  onSkip,
  elementRefs = {},
  onTabChange,
}: AppTourProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [highlightLayout, setHighlightLayout] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const insets = useSafeAreaInsets();
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const tooltipOpacity = useRef(new Animated.Value(0)).current;
  const tooltipScale = useRef(new Animated.Value(0.8)).current;

  const steps = appTourService.getTourSteps(userType);
  const currentStep = steps[currentStepIndex];

  // Measure element position when step changes
  useEffect(() => {
    if (!visible || !currentStep) return;

    const measureElement = () => {
      // For center/welcome/complete steps, don't highlight anything
      if (currentStep.position === 'center' || currentStep.target === 'welcome' || currentStep.target === 'complete') {
        setHighlightLayout(null);
        animateTooltip();
        return;
      }

      const ref = elementRefs[currentStep.target];
      if (ref?.current) {
        // Try to measure the element
        ref.current.measure((x, y, w, h, pageX, pageY) => {
          setHighlightLayout({
            x: pageX,
            y: pageY,
            width: w || 200,
            height: h || 50,
          });
          animateTooltip();
        });
      } else {
        // For bottom navigation tabs, we'll use a fixed position
        if (currentStep.target.includes('-tab')) {
          const tabIndex = getTabIndex(currentStep.target);
          if (tabIndex !== -1) {
            const tabCount = getTabCount();
            const tabWidth = width / tabCount;
            const tabX = tabIndex * tabWidth + tabWidth / 2;
            setHighlightLayout({
              x: tabX - 40,
              y: height - (insets.bottom + 60),
              width: 80,
              height: 60,
            });
            animateTooltip();
            return;
          }
        }
        // If we can't find the element, don't highlight
        setHighlightLayout(null);
        animateTooltip();
      }
    };

    // Small delay to ensure layout is ready
    const timer = setTimeout(measureElement, 300);
    return () => clearTimeout(timer);
  }, [currentStepIndex, visible, currentStep, elementRefs, insets.bottom]);

  const animateTooltip = () => {
    Animated.parallel([
      Animated.timing(tooltipOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(tooltipScale, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  };

  useEffect(() => {
    if (visible) {
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      overlayOpacity.setValue(0);
      tooltipOpacity.setValue(0);
      tooltipScale.setValue(0.8);
    }
  }, [visible]);

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      tooltipOpacity.setValue(0);
      tooltipScale.setValue(0.8);
      const nextStepIndex = currentStepIndex + 1;
      const nextStep = steps[nextStepIndex];
      
      // Switch to appropriate tab if needed
      if (onTabChange && nextStep) {
        const tabMap: Record<string, string> = {
          'home-tab': 'home',
          'discover-tab': 'discover',
          'appointments-tab': 'appointments',
          'messages-tab': 'messages',
          'blogs-tab': 'blogs',
          'docbot-tab': 'docbot',
          'profile-tab': 'profile',
          'working-hours-tab': 'working-hours',
        };
        const tab = tabMap[nextStep.target];
        if (tab) {
          onTabChange(tab);
        }
      }
      
      setCurrentStepIndex(nextStepIndex);
      
      // Execute step action if present
      if (currentStep.action) {
        currentStep.action();
      }
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      tooltipOpacity.setValue(0);
      tooltipScale.setValue(0.8);
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const handleComplete = async () => {
    await appTourService.markTourCompleted(userType);
    onComplete();
  };

  const handleSkip = () => {
    if (onSkip) {
      onSkip();
    } else {
      handleComplete();
    }
  };

  const getTabIndex = (target: string): number => {
    const tabMap: Record<string, number> = {
      'home-tab': 0,
      'discover-tab': userType === 'patient' ? 1 : -1,
      'appointments-tab': userType === 'patient' ? -1 : 1, // Patient doesn't have appointments tab in bottom nav
      'messages-tab': userType === 'patient' ? 2 : 2,
      'blogs-tab': userType === 'patient' ? 3 : -1,
      'docbot-tab': userType === 'patient' ? 4 : -1,
      'profile-tab': userType === 'patient' ? -1 : -1, // Profile accessed via header
      'working-hours-tab': userType === 'doctor' ? 3 : -1,
    };
    return tabMap[target] ?? -1;
  };

  const getTabCount = (): number => {
    return userType === 'patient' ? 5 : 4;
  };

  const getTooltipPosition = () => {
    const tooltipWidth = 300;
    const tooltipHeight = 150;
    const spacing = 20;

    // For center/welcome/complete steps, center the tooltip
    if (!highlightLayout || currentStep.position === 'center' || currentStep.target === 'welcome' || currentStep.target === 'complete') {
      return {
        top: height / 2 - tooltipHeight / 2,
        left: width / 2 - tooltipWidth / 2,
      };
    }

    const { x, y, width: w, height: h } = highlightLayout;

    switch (currentStep.position) {
      case 'top':
        return {
          top: Math.max(insets.top + 20, y - tooltipHeight - spacing),
          left: Math.max(20, Math.min(width - tooltipWidth - 20, x + w / 2 - tooltipWidth / 2)),
        };
      case 'bottom':
        // For bottom nav tabs, show tooltip above
        if (currentStep.target.includes('-tab')) {
          return {
            top: y - tooltipHeight - spacing,
            left: Math.max(20, Math.min(width - tooltipWidth - 20, x + w / 2 - tooltipWidth / 2)),
          };
        }
        return {
          top: y + h + spacing,
          left: Math.max(20, Math.min(width - tooltipWidth - 20, x + w / 2 - tooltipWidth / 2)),
        };
      case 'left':
        return {
          top: Math.max(insets.top + 20, y + h / 2 - tooltipHeight / 2),
          left: Math.max(20, x - tooltipWidth - spacing),
        };
      case 'right':
        return {
          top: Math.max(insets.top + 20, y + h / 2 - tooltipHeight / 2),
          left: Math.min(width - tooltipWidth - 20, x + w + spacing),
        };
      default:
        return {
          top: Math.max(insets.top + 20, y - tooltipHeight - spacing),
          left: Math.max(20, Math.min(width - tooltipWidth - 20, x + w / 2 - tooltipWidth / 2)),
        };
    }
  };

  if (!visible || !currentStep) return null;

  const tooltipPosition = getTooltipPosition();
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === steps.length - 1;

  return (
    <Modal visible={visible} transparent animationType="none">
      <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
        {/* Highlighted area */}
        {highlightLayout && (
          <View
            style={[
              styles.highlight,
              {
                left: highlightLayout.x,
                top: highlightLayout.y,
                width: highlightLayout.width,
                height: highlightLayout.height,
              },
            ]}
          />
        )}

        {/* Tooltip */}
        <Animated.View
          style={[
            styles.tooltip,
            tooltipPosition,
            {
              opacity: tooltipOpacity,
              transform: [{ scale: tooltipScale }],
            },
          ]}
        >
          <View style={styles.tooltipContent}>
            <Text style={styles.tooltipTitle}>{currentStep.title}</Text>
            <Text style={styles.tooltipDescription}>{currentStep.description}</Text>

            <View style={styles.tooltipFooter}>
              <View style={styles.stepIndicator}>
                {steps.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.stepDot,
                      index === currentStepIndex && styles.stepDotActive,
                    ]}
                  />
                ))}
              </View>

              <View style={styles.tooltipButtons}>
                {!isFirstStep && (
                  <TouchableOpacity
                    style={styles.tooltipButtonSecondary}
                    onPress={handlePrevious}
                  >
                    <Text style={styles.tooltipButtonSecondaryText}>Previous</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.tooltipButtonSkip}
                  onPress={handleSkip}
                >
                  <Text style={styles.tooltipButtonSkipText}>Skip</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.tooltipButtonPrimary}
                  onPress={handleNext}
                >
                  <Text style={styles.tooltipButtonPrimaryText}>
                    {isLastStep ? 'Get Started' : 'Next'}
                  </Text>
                  {!isLastStep && (
                    <Icon name="chevron-right" size={16} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  highlight: {
    position: 'absolute',
    borderRadius: 12,
    backgroundColor: 'transparent',
    borderWidth: 3,
    borderColor: '#4CAF50',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 10,
  },
  tooltip: {
    position: 'absolute',
    width: 300,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    ...Platform.select({
      web: {
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 10,
      },
    }),
  },
  tooltipContent: {
    flex: 1,
  },
  tooltipTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  tooltipDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
  },
  tooltipFooter: {
    marginTop: 8,
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    gap: 6,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E0E0E0',
  },
  stepDotActive: {
    backgroundColor: '#4CAF50',
    width: 24,
  },
  tooltipButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
  },
  tooltipButtonPrimary: {
    backgroundColor: '#4CAF50',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tooltipButtonPrimaryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  tooltipButtonSecondary: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  tooltipButtonSecondaryText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  tooltipButtonSkip: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  tooltipButtonSkipText: {
    color: '#999',
    fontSize: 14,
  },
});

