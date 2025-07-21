import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function BlogArticle4() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()}
        >
          <FontAwesome name="arrow-left" size={20} color="#4CAF50" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Blog</Text>
        <TouchableOpacity style={styles.shareButton}>
          <FontAwesome name="share" size={20} color="#4CAF50" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero Image */}
        <Image 
          source={require('../assets/images/stressed.jpg')} 
          style={styles.heroImage}
        />

        {/* Article Content */}
        <View style={styles.articleContainer}>
          {/* Title */}
          <Text style={styles.articleTitle}>
            Coping with Stress and Anxiety: Tips to Manage It in Everyday Life
          </Text>

          {/* Meta Info */}
          <View style={styles.metaInfo}>
            <View style={styles.metaItem}>
              <FontAwesome name="calendar" size={14} color="#888" />
              <Text style={styles.metaText}>December 2024</Text>
            </View>
            <View style={styles.metaItem}>
              <FontAwesome name="clock-o" size={14} color="#888" />
              <Text style={styles.metaText}>6 min read</Text>
            </View>
            <View style={styles.metaItem}>
              <FontAwesome name="user" size={14} color="#888" />
              <Text style={styles.metaText}>Health Team</Text>
            </View>
          </View>

          {/* Article Body */}
          <View style={styles.articleBody}>
            <Text style={styles.paragraph}>
              Stress and anxiety happen. Work, school, family—sometimes it all feels like too much. But small things done daily can help you stay in control.
            </Text>

            <Text style={styles.sectionTitle}>
              Here are 5 easy techniques you can start today:
            </Text>

            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}>
                <FontAwesome name="check-circle" size={20} color="#4CAF50" />
                <Text style={styles.techniqueTitle}>1. Breathe Like You Mean It</Text>
              </View>
              <Text style={styles.techniqueDescription}>
                When things get overwhelming, pause. Take 5 deep, slow breaths—in through your nose, out through your mouth. It sounds basic, but it helps calm your nervous system instantly.
              </Text>
            </View>

            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}>
                <FontAwesome name="check-circle" size={20} color="#4CAF50" />
                <Text style={styles.techniqueTitle}>2. Write It Out</Text>
              </View>
              <Text style={styles.techniqueDescription}>
                Journaling isn't just for big feelings. Even scribbling down small frustrations clears your head. Try writing for 3–5 minutes at the end of your day.
              </Text>
            </View>

            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}>
                <FontAwesome name="check-circle" size={20} color="#4CAF50" />
                <Text style={styles.techniqueTitle}>3. Move, Even for 5 Minutes</Text>
              </View>
              <Text style={styles.techniqueDescription}>
                You don't need a gym. A quick walk, some stretches, or even dancing around your room helps release built-up tension.
              </Text>
            </View>

            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}>
                <FontAwesome name="check-circle" size={20} color="#4CAF50" />
                <Text style={styles.techniqueTitle}>4. Say "No" Without Guilt</Text>
              </View>
              <Text style={styles.techniqueDescription}>
                You can't do everything. Practice saying "no" to extra things that drain your energy. Protect your mental space like it's a VIP section.
              </Text>
            </View>

            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}>
                <FontAwesome name="check-circle" size={20} color="#4CAF50" />
                <Text style={styles.techniqueTitle}>5. Talk to Someone</Text>
              </View>
              <Text style={styles.techniqueDescription}>
                Whether it's a friend or an online therapist through a telehealth app, talking really helps. You don't have to carry everything on your own.
              </Text>
            </View>

            {/* Bottom Line */}
            <View style={styles.bottomLineCard}>
              <Text style={styles.bottomLineTitle}>Bottom Line:</Text>
              <Text style={styles.bottomLineText}>
                Stress is part of life. But feeling stuck in it doesn't have to be.
              </Text>
              <Text style={styles.bottomLineText}>
                Try one or two of these techniques today—and if things feel heavier, remember telehealth support is always one tap away.
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
  techniqueCard: {
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
  techniqueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  techniqueTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#222',
    marginLeft: 12,
    flex: 1,
  },
  techniqueDescription: {
    fontSize: 15,
    color: '#666',
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
    marginBottom: 8,
  },
}); 