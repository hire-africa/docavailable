import { useRouter } from 'expo-router';
import React from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '../components/Icon';


export default function BlogArticle6() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()}
        >
          <Icon name="arrowLeft" size={16} color="#222" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Blog</Text>
        <TouchableOpacity style={styles.shareButton}>
          <Icon name="share" size={16} color="#222" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero Image */}
        <Image 
          source={require('../assets/images/marathon.jpg')} 
          style={styles.heroImage}
        />

        {/* Article Content */}
        <View style={styles.articleContainer}>
          {/* Title */}
          <Text style={styles.articleTitle}>
            From Couch to 5K: Building Fitness Habits That Actually Stick
          </Text>

          {/* Meta Info */}
          <View style={styles.metaInfo}>
            <View style={styles.metaItem}>
              <Text style={{ fontSize: 14, color: '#888' }}>??</Text>
              <Text style={styles.metaText}>December 2024</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={{ fontSize: 14, color: '#888' }}>?</Text>
              <Text style={styles.metaText}>7 min read</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={{ fontSize: 14, color: '#888' }}>??</Text>
              <Text style={styles.metaText}>Health Team</Text>
            </View>
          </View>

          {/* Article Body */}
          <View style={styles.articleBody}>
            <Text style={styles.paragraph}>
              Let's be honest—most of us have been there. You buy the gym membership, download the fitness app, maybe even buy new workout clothes. But two weeks later, you're back on the couch wondering where your motivation went.
            </Text>

            <Text style={styles.paragraph}>
              The truth is, building lasting fitness habits isn't about willpower—it's about strategy. Here's how to make fitness stick, even when life gets busy:
            </Text>

            <Text style={styles.sectionTitle}>The 3-Step Fitness Formula</Text>

            <View style={styles.stepCard}>
              <View style={styles.stepHeader}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>1</Text>
                </View>
                <Text style={styles.stepTitle}>Start Smaller Than You Think</Text>
              </View>
              <Text style={styles.stepDescription}>
                Instead of jumping into hour-long workouts, start with just 10 minutes. A quick walk around the block, some basic stretches, or even dancing to your favorite song counts. The goal is consistency, not intensity.
              </Text>
            </View>

            <View style={styles.stepCard}>
              <View style={styles.stepHeader}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>2</Text>
                </View>
                <Text style={styles.stepTitle}>Make It Part of Your Routine</Text>
              </View>
              <Text style={styles.stepDescription}>
                Link your workout to something you already do daily. After your morning coffee? 10-minute workout. Before dinner? Quick walk. This creates a habit loop that's hard to break.
              </Text>
            </View>

            <View style={styles.stepCard}>
              <View style={styles.stepHeader}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>3</Text>
                </View>
                <Text style={styles.stepTitle}>Track Progress, Not Perfection</Text>
              </View>
              <Text style={styles.stepDescription}>
                Focus on showing up, not on perfect workouts. Celebrate the small wins—every workout completed is a victory, regardless of how intense it was.
              </Text>
            </View>

            <Text style={styles.sectionTitle}>Quick Workouts for Busy Lives</Text>

            <View style={styles.workoutCard}>
              <View style={styles.workoutHeader}>
                <Text style={{ fontSize: 14, color: '#888' }}>?</Text>
                <Text style={styles.workoutTitle}>The 5-Minute Morning Boost</Text>
              </View>
              <Text style={styles.workoutDescription}>
                Jumping jacks, push-ups, squats, and planks. Do each for 30 seconds, rest 30 seconds, repeat twice. Done in 5 minutes, energized for the day.
              </Text>
            </View>

            <View style={styles.workoutCard}>
              <View style={styles.workoutHeader}>
                <Text style={{ fontSize: 16 }}>??</Text>
                <Text style={styles.workoutTitle}>Living Room Cardio</Text>
              </View>
              <Text style={styles.workoutDescription}>
                No equipment needed. High knees, mountain climbers, burpees, and jumping rope (pretend if you don't have one). 20 seconds each, 10 seconds rest, 4 rounds.
              </Text>
            </View>

            <View style={styles.workoutCard}>
              <View style={styles.workoutHeader}>
                <Text style={{ fontSize: 16 }}>??</Text>
                <Text style={styles.workoutTitle}>Pre-Sleep Stretch</Text>
              </View>
              <Text style={styles.workoutDescription}>
                Gentle stretches to unwind: cat-cow, child's pose, gentle twists. Perfect for stress relief and better sleep quality.
              </Text>
            </View>

            <Text style={styles.sectionTitle}>Building Your Fitness Foundation</Text>

            <View style={styles.foundationList}>
              <View style={styles.foundationItem}>
                <Text style={{ fontSize: 16 }}>??</Text>
                <Text style={styles.foundationText}>Cardio: Start with walking, progress to jogging</Text>
              </View>
              <View style={styles.foundationItem}>
                <Text style={{ fontSize: 14, color: '#4CAF50' }}>?</Text>
                <Text style={styles.foundationText}>Strength: Bodyweight exercises first, then weights</Text>
              </View>
              <View style={styles.foundationItem}>
                <Text style={{ fontSize: 14, color: '#4CAF50' }}>?</Text>
                <Text style={styles.foundationText}>Flexibility: Daily stretching prevents injuries</Text>
              </View>
              <View style={styles.foundationItem}>
                <Text style={{ fontSize: 16 }}>??</Text>
                <Text style={styles.foundationText}>Recovery: Rest days are just as important</Text>
              </View>
            </View>

            <View style={styles.tipCard}>
              <Text style={styles.tipTitle}>Pro Tip:</Text>
              <Text style={styles.tipText}>
                Use telehealth apps to get personalized fitness advice from certified trainers and nutritionists. They can help you create a plan that fits your lifestyle and health goals.
              </Text>
            </View>

            {/* Bottom Line */}
            <View style={styles.bottomLineCard}>
              <Text style={styles.bottomLineTitle}>Bottom Line:</Text>
              <Text style={styles.bottomLineText}>
                Fitness isn't about being perfect—it's about being consistent. Start small, build gradually, and remember that every step counts. Your future self will thank you.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F8FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
  },
  shareButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F8FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  heroImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  articleContainer: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },
  articleTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#222',
    lineHeight: 32,
    marginBottom: 16,
  },
  metaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    flexWrap: 'wrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
    marginBottom: 8,
  },
  metaText: {
    fontSize: 14,
    color: '#888',
    marginLeft: 6,
  },
  articleBody: {
    gap: 20,
  },
  paragraph: {
    fontSize: 16,
    color: '#444',
    lineHeight: 24,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
    marginTop: 16,
    marginBottom: 16,
  },
  stepCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  stepNumberText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#222',
    flex: 1,
  },
  stepDescription: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
  },
  workoutCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  workoutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  workoutTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#222',
    marginLeft: 12,
    flex: 1,
  },
  workoutDescription: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
  },
  foundationList: {
    marginTop: 8,
  },
  foundationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  foundationText: {
    fontSize: 16,
    color: '#444',
    marginLeft: 12,
    flex: 1,
  },
  tipCard: {
    backgroundColor: '#FFF3CD',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FFC107',
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 8,
  },
  tipText: {
    fontSize: 15,
    color: '#856404',
    lineHeight: 22,
  },
  bottomLineCard: {
    backgroundColor: '#4CAF50',
    borderRadius: 16,
    padding: 20,
    marginTop: 8,
  },
  bottomLineTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  bottomLineText: {
    fontSize: 15,
    color: '#FFFFFF',
    lineHeight: 22,
    opacity: 0.95,
  },
}); 
