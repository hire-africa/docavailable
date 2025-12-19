import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '../components/Icon';

export default function BlogArticle25() {
  const router = useRouter();
  const [isBookmarked, setIsBookmarked] = useState(false);
  const handleShare = async () => {
    try {
      await Share.share({ message: 'Check out this great article from DocAvailable: Anemia Explained: Why You\'re Always Tired', url: 'https://docavailable.com/blog/anemia-explained' });
    } catch (error) {
      Alert.alert('Error', 'Unable to share article');
    }
  };
  const toggleBookmark = () => setIsBookmarked(!isBookmarked);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}><Icon name="arrowLeft" size={16} color="#222" /></TouchableOpacity>
        <Text style={styles.headerTitle}>Blog</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.bookmarkButton} onPress={toggleBookmark}><Icon name={isBookmarked ? "bookmark" : "bookmarkO"} size={18} color={isBookmarked ? "#4CAF50" : "#666"} /></TouchableOpacity>
          <TouchableOpacity style={styles.shareButton} onPress={handleShare}><Icon name="share" size={18} color="#666" /></TouchableOpacity>
        </View>
      </View>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Image source={require('../assets/images/articles/anemia.jpeg')} style={styles.heroImage} />
        <View style={styles.articleContainer}>
          <Text style={styles.articleTitle}>Anemia Explained: Why You're Always Tired</Text>
          <View style={styles.metaInfo}>
            <View style={styles.metaItem}><Icon name="calendar" size={14} color="#888" /><Text style={styles.metaText}>January 2024</Text></View>
            <View style={styles.metaItem}><Icon name="clock" size={14} color="#888" /><Text style={styles.metaText}>6 min read</Text></View>
            <View style={styles.metaItem}><Icon name="userMd" size={14} color="#888" /><Text style={styles.metaText}>DocAvailable Team</Text></View>
          </View>
          <View style={styles.articleBody}>
            <Text style={styles.paragraph}>If you're constantly tired, pale, and feeling weak, you might have anemia. It's one of the most common blood conditions, affecting billions of people worldwide. Understanding what causes it and how to treat it can help you feel like yourself again.</Text>
            <Text style={styles.sectionTitle}>What Is Anemia?</Text>
            <Text style={styles.paragraph}>Anemia occurs when you don't have enough healthy red blood cells or hemoglobin (the protein that carries oxygen) in your blood. Without enough red blood cells, your body can't get enough oxygen to tissues and organs, leaving you feeling tired and weak.</Text>
            <Text style={styles.sectionTitle}>Common Symptoms</Text>
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="exclamationTriangle" size={14} color="#FF6B6B" /><Text style={styles.techniqueTitle}>Fatigue and Weakness</Text></View>
              <Text style={styles.techniqueDescription}>Feeling tired all the time, even after a good night's sleep. This is the most common symptom because your body isn't getting enough oxygen.</Text>
            </View>
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="exclamationTriangle" size={14} color="#FF6B6B" /><Text style={styles.techniqueTitle}>Pale Skin</Text></View>
              <Text style={styles.techniqueDescription}>Your skin, especially inside your eyelids, nails, and gums, may look pale or yellowish.</Text>
            </View>
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="exclamationTriangle" size={14} color="#FF6B6B" /><Text style={styles.techniqueTitle}>Shortness of Breath</Text></View>
              <Text style={styles.techniqueDescription}>Feeling winded during normal activities or even at rest, because your body is trying to get more oxygen.</Text>
            </View>
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="exclamationTriangle" size={14} color="#FF6B6B" /><Text style={styles.techniqueTitle}>Dizziness and Headaches</Text></View>
              <Text style={styles.techniqueDescription}>Lightheadedness, especially when standing up, and frequent headaches.</Text>
            </View>
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="exclamationTriangle" size={14} color="#FF6B6B" /><Text style={styles.techniqueTitle}>Cold Hands and Feet</Text></View>
              <Text style={styles.techniqueDescription}>Poor circulation due to fewer red blood cells can make extremities feel cold.</Text>
            </View>
            <Text style={styles.sectionTitle}>Common Causes</Text>
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="infoCircle" size={14} color="#2196F3" /><Text style={styles.techniqueTitle}>Iron Deficiency</Text></View>
              <Text style={styles.techniqueDescription}>The most common cause. Your body needs iron to make hemoglobin. Low iron can be due to blood loss (heavy periods, ulcers, bleeding), poor diet, or inability to absorb iron.</Text>
            </View>
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="infoCircle" size={14} color="#2196F3" /><Text style={styles.techniqueTitle}>Vitamin Deficiencies</Text></View>
              <Text style={styles.techniqueDescription}>Lack of vitamin B12 or folate (B9) can cause anemia. B12 deficiency is common in vegetarians/vegans or people with absorption problems.</Text>
            </View>
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="infoCircle" size={14} color="#2196F3" /><Text style={styles.techniqueTitle}>Chronic Diseases</Text></View>
              <Text style={styles.techniqueDescription}>Kidney disease, cancer, rheumatoid arthritis, and other chronic conditions can cause anemia.</Text>
            </View>
            <Text style={styles.sectionTitle}>Diagnosis and Treatment</Text>
            <Text style={styles.paragraph}>A simple blood test (complete blood count, or CBC) can diagnose anemia. Treatment depends on the cause:</Text>
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="checkCircle" size={14} color="#4CAF50" /><Text style={styles.techniqueTitle}>Iron Supplements</Text></View>
              <Text style={styles.techniqueDescription}>For iron deficiency anemia, iron supplements and iron-rich foods (red meat, spinach, beans, fortified cereals) can help.</Text>
            </View>
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="checkCircle" size={14} color="#4CAF50" /><Text style={styles.techniqueTitle}>Vitamin Supplements</Text></View>
              <Text style={styles.techniqueDescription}>B12 or folate supplements for vitamin deficiency anemia. B12 may need injections if absorption is the problem.</Text>
            </View>
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="checkCircle" size={14} color="#4CAF50" /><Text style={styles.techniqueTitle}>Treating Underlying Cause</Text></View>
              <Text style={styles.techniqueDescription}>If anemia is caused by a chronic disease or bleeding, treating that condition is essential.</Text>
            </View>
            <View style={styles.bottomLineCard}>
              <Text style={styles.bottomLineTitle}>Bottom Line:</Text>
              <Text style={styles.bottomLineText}>If you're constantly tired, pale, and weak, you might have anemia. A simple blood test can confirm it. Treatment — usually iron or vitamin supplements — can help you feel like yourself again. Don't just assume you're "just busy" or "getting older" — get checked if symptoms persist.</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' }, header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F0F8FF', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#222' },
  bookmarkButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F0F8FF', alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  shareButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F0F8FF', alignItems: 'center', justifyContent: 'center' },
  headerActions: { flexDirection: 'row' }, content: { flex: 1 },
  heroImage: { width: '100%', height: 200, resizeMode: 'cover' },
  articleContainer: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40 },
  articleTitle: { fontSize: 24, fontWeight: 'bold', color: '#222', lineHeight: 32, marginBottom: 16 },
  metaInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap' },
  metaItem: { flexDirection: 'row', alignItems: 'center', marginRight: 20, marginBottom: 8 },
  metaText: { fontSize: 14, color: '#888', marginLeft: 6 },
  articleBody: { gap: 20 },
  paragraph: { fontSize: 16, color: '#444', lineHeight: 24, marginBottom: 8 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#222', marginTop: 16, marginBottom: 16 },
  techniqueCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
  techniqueHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  techniqueTitle: { fontSize: 16, fontWeight: 'bold', color: '#222', marginLeft: 12, flex: 1 },
  techniqueDescription: { fontSize: 15, color: '#666', lineHeight: 22 },
  bottomLineCard: { backgroundColor: '#4CAF50', borderRadius: 16, padding: 20, marginTop: 8 },
  bottomLineTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 8 },
  bottomLineText: { fontSize: 15, color: '#FFFFFF', lineHeight: 22, opacity: 0.95, marginBottom: 8 },
});

