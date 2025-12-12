import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
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
  steps?: TourStep[]; // Optional custom steps
  scrollViewRef?: React.RefObject<ScrollView>; // Ref to ScrollView for auto-scrolling
}

export default function AppTour({
  visible,
  userType,
  onComplete,
  onSkip,
  elementRefs = {},
  onTabChange,
  steps: customSteps,
  scrollViewRef,
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

  const steps = customSteps || appTourService.getTourSteps(userType);
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
        // First scroll to the element, then measure
        const scrollAndMeasure = () => {
          // Get initial position to calculate scroll
          ref.current?.measure((x, y, w, h, pageX, pageY) => {
            // Auto-scroll to show the element
            if (scrollViewRef?.current) {
              const screenHeight = height;
              const tooltipHeight = currentStep.imagePath ? 350 : 150;

              let scrollTo = 0;
              // Calculate scroll position based on tooltip position
              if (currentStep.position === 'top') {
                // For top tooltips, scroll to show element in lower half of screen
                // This leaves room for tooltip above
                scrollTo = Math.max(0, pageY - (screenHeight * 0.6));
              } else if (currentStep.position === 'bottom') {
                // For bottom tooltips, scroll to show element in upper half
                scrollTo = Math.max(0, pageY - (screenHeight * 0.3));
              }

              scrollViewRef.current.scrollTo({
                y: scrollTo,
                animated: true,
              });

              // Wait for scroll to complete, then measure in window
              setTimeout(() => {
                ref.current?.measureInWindow((winX, winY, winW, winH) => {
                  setHighlightLayout({
                    x: winX,
                    y: winY,
                    width: winW || 200,
                    height: winH || 50,
                  });
                  animateTooltip();
                });
              }, 400); // Wait for scroll animation
            } else {
              // No scroll view, just measure
              ref.current?.measureInWindow((winX, winY, winW, winH) => {
                setHighlightLayout({
                  x: winX,
                  y: winY,
                  width: winW || 200,
                  height: winH || 50,
                });
                animateTooltip();
              });
            }
          });
        };

        scrollAndMeasure();
      } else {
        // For bottom navigation tabs, we'll use a fixed position
        if (currentStep.target.includes('-tab')) {
          const tabIndex = getTabIndex(currentStep.target);
          if (tabIndex !== -1) {
            const tabCount = getTabCount();
            const tabWidth = width / tabCount;
            // Center the highlight on the tab
            const tabX = tabIndex * tabWidth;
            setHighlightLayout({
              x: tabX + (tabWidth / 2) - 35, // Center with 70px width
              y: height - (insets.bottom + 65), // Adjusted for better alignment
              width: 70, // Slightly narrower for better fit
              height: 50, // Reduced height to fit tab better
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

    // No delay for center steps, minimal delay for others
    const delay = (currentStep.position === 'center' || currentStep.target === 'welcome' || currentStep.target === 'complete') ? 0 : 50;
    const timer = setTimeout(measureElement, delay);
    return () => clearTimeout(timer);
  }, [currentStepIndex, visible, currentStep, elementRefs, insets.bottom]);

  const animateTooltip = () => {
    Animated.parallel([
      Animated.timing(tooltipOpacity, {
        toValue: 1,
        duration: 200, // Reduced from 300ms
        useNativeDriver: true,
      }),
      Animated.spring(tooltipScale, {
        toValue: 1,
        tension: 80, // Increased for faster animation
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  };

  useEffect(() => {
    if (visible) {
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 200, // Reduced from 300ms
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
      const nextStepIndex = currentStepIndex + 1;
      const nextStep = steps[nextStepIndex];

      // Immediately update step index for faster perceived transition
      setCurrentStepIndex(nextStepIndex);

      // Reset animations immediately without waiting
      tooltipOpacity.setValue(0);
      tooltipScale.setValue(0.8);

      // Switch to appropriate tab if needed (non-blocking)
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
          // Use requestAnimationFrame for non-blocking tab change
          requestAnimationFrame(() => {
            onTabChange(tab);
          });
        }
      }

      // Execute step action if present (non-blocking)
      if (currentStep.action) {
        requestAnimationFrame(() => {
          currentStep.action?.();
        });
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
    // Larger height when image is present
    const tooltipHeight = currentStep.imagePath ? 350 : 150;
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
          top: Math.max(insets.top + 20, y - tooltipHeight - 60), // Increased spacing
          left: Math.max(20, Math.min(width - tooltipWidth - 20, x + w / 2 - tooltipWidth / 2)),
        };
      case 'bottom':
        // For bottom nav tabs, show tooltip well above with extra spacing
        if (currentStep.target.includes('-tab')) {
          return {
            top: y - tooltipHeight - 80, // Much more spacing to keep nav visible
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

        <Animated.View
          style={[
            styles.tooltipContainer,
            tooltipPosition,
            {
              opacity: tooltipOpacity,
              transform: [{ scale: tooltipScale }],
            },
          ]}
        >
          <LinearGradient
            colors={['#2E7D32', '#1B5E20']} // Darker green gradient
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.tooltipGradient}
          >
            <View style={styles.tooltipContent}>
              {currentStep.imagePath && (
                <Image
                  source={currentStep.imagePath}
                  style={styles.tourImage}
                  resizeMode="contain"
                />
              )}
              <Text style={styles.tooltipTitle}>{currentStep.title}</Text>
              <Text style={styles.tooltipDescription}>{currentStep.description}</Text>

              <View style={styles.tooltipFooter}>
                {/* Step indicators removed per user request */}
                {/* {!isFirstStep && (
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
                )} */}

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
                      <Icon name="chevronRight" size={16} color="#1B5E20" />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </LinearGradient>
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
    borderColor: '#B4FF3C', // Lime green for high visibility
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
  },
  tooltipContainer: {
    position: 'absolute',
    width: 320, // Slightly wider
    borderRadius: 20,
    ...Platform.select({
      web: {
        boxShadow: '0 15px 35px rgba(0, 50, 20, 0.5)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.4,
        shadowRadius: 20,
        elevation: 15,
      },
    }),
  },
  tooltipGradient: {
    borderRadius: 20,
    padding: 24,
    width: '100%',
  },
  tooltipContent: {
    flex: 1,
  },
  tourImage: {
    width: 150,
    height: 150,
    alignSelf: 'center',
    marginBottom: 16,
  },
  tooltipTitle: {
    fontSize: 20,
    fontWeight: '700', // Professional bold
    color: '#FFFFFF',
    marginBottom: 10,
    letterSpacing: 0.3,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  tooltipDescription: {
    fontSize: 15,
    color: '#F1F8E9', // Very light green/white
    lineHeight: 24, // Better readability
    marginBottom: 24,
    fontWeight: '400',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  tooltipFooter: {
    marginTop: 0,
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginBottom: 20,
    gap: 8,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  stepDotActive: {
    backgroundColor: '#FFFFFF',
    width: 24,
  },
  tooltipButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tooltipButtonPrimary: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: 'rgba(0,0,0,0.2)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 3,
  },
  tooltipButtonPrimaryText: {
    color: '#1B5E20', // Dark green text
    fontSize: 15,
    fontWeight: '600',
  },
  tooltipButtonSecondary: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  tooltipButtonSecondaryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  tooltipButtonSkip: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  tooltipButtonSkipText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    fontWeight: '500',
  },
});

