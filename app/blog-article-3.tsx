import { useRouter } from 'expo-router';
import React from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '../components/Icon';


export default function BlogArticle3() {
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
          source={require('../assets/images/ai.jpg')} 
          style={styles.heroImage}
        />

        {/* Article Content */}
        <View style={styles.articleContainer}>
          {/* Title */}
          <Text style={styles.articleTitle}>
            The Future of Healthcare: Telemedicine and AI
          </Text>

          {/* Meta Info */}
          <View style={styles.metaInfo}>
            <View style={styles.metaItem}>
              <Icon name="calendar" size={14} color="#888" />
              <Text style={styles.metaText}>December 2024</Text>
            </View>
            <View style={styles.metaItem}>
              <Icon name="clock" size={14} color="#888" />
              <Text style={styles.metaText}>4 min read</Text>
            </View>
            <View style={styles.metaItem}>
              <Icon name="userMd" size={14} color="#888" />
              <Text style={styles.metaText}>Health Team</Text>
            </View>
          </View>

          {/* Article Body */}
          <View style={styles.articleBody}>
            <Text style={styles.paragraph}>
              Healthcare isn't just about hospital visits anymore. Thanks to telemedicine and AI (Artificial Intelligence), things are changing—fast.
            </Text>

            <Text style={styles.sectionTitle}>
              Here's what's already happening (and what's coming next):
            </Text>

            <View style={styles.featureCard}>
              <View style={styles.featureHeader}>
                <Icon name="robot" size={14} color="#4CAF50" />
                <Text style={styles.featureTitle}>Smart Health Bots That Actually Help</Text>
              </View>
              <Text style={styles.featureDescription}>
                Not just basic chatbots. AI can now suggest care options, answer health questions, and even remind you to take your meds—all from your phone.
              </Text>
            </View>

            <View style={styles.featureCard}>
              <View style={styles.featureHeader}>
                <Icon name="search" size={14} color="#4CAF50" />
                <Text style={styles.featureTitle}>Faster Diagnoses, Fewer Errors</Text>
              </View>
              <Text style={styles.featureDescription}>
                AI helps doctors spot patterns faster. Think: analyzing lab results, reviewing symptoms, and even flagging risks before they become big problems.
              </Text>
            </View>

            <View style={styles.featureCard}>
              <View style={styles.featureHeader}>
                <Icon name="clock" size={14} color="#4CAF50" />
                <Text style={styles.featureTitle}>24/7 Access, No Waiting Rooms</Text>
              </View>
              <Text style={styles.featureDescription}>
                Whether it's 2 a.m. or a holiday, telemedicine means you can connect with a doctor when you need one—plus AI helps speed up pre-check-in questions.
              </Text>
            </View>

            <View style={styles.featureCard}>
              <View style={styles.featureHeader}>
                <Icon name="user" size={14} color="#4CAF50" />
                <Text style={styles.featureTitle}>Personalized Care Plans</Text>
              </View>
              <Text style={styles.featureDescription}>
                AI + telehealth apps can track your health data and create customized plans—whether it's for mental health, fitness, or managing chronic conditions.
              </Text>
            </View>

            <View style={styles.whatItMeansCard}>
              <Text style={styles.whatItMeansTitle}>What This Means for You:</Text>
              <Text style={styles.whatItMeansText}>
                Healthcare's becoming smarter, faster, and easier to access. No more waiting weeks for appointments or googling symptoms at midnight.
              </Text>
              <Text style={styles.whatItMeansText}>
                With telemedicine and AI, your health really does fit in your pocket.
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
  featureCard: {
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
  featureHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#222',
    marginLeft: 12,
    flex: 1,
  },
  featureDescription: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
  },
  whatItMeansCard: {
    backgroundColor: '#E8F5E8',
    borderRadius: 16,
    padding: 20,
    marginTop: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  whatItMeansTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 12,
  },
  whatItMeansText: {
    fontSize: 15,
    color: '#2E7D32',
    lineHeight: 22,
    marginBottom: 8,
  },
}); 
