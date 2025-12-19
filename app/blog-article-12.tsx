import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '../components/Icon';

export default function BlogArticle12() {
  const router = useRouter();
  const [isBookmarked, setIsBookmarked] = useState(false);
  const handleShare = async () => {
    try {
      await Share.share({ message: 'Check out this great article from DocAvailable: HIV Today: Symptoms, Treatment, and Why Life Expectancy Has Changed', url: 'https://docavailable.com/blog/hiv-today' });
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
        <Image source={require('../assets/images/articles/HIV.avif')} style={styles.heroImage} />
        <View style={styles.articleContainer}>
          <Text style={styles.articleTitle}>HIV Today: Symptoms, Treatment, and Why Life Expectancy Has Changed</Text>
          <View style={styles.metaInfo}>
            <View style={styles.metaItem}><Icon name="calendar" size={14} color="#888" /><Text style={styles.metaText}>January 2024</Text></View>
            <View style={styles.metaItem}><Icon name="clock" size={14} color="#888" /><Text style={styles.metaText}>9 min read</Text></View>
            <View style={styles.metaItem}><Icon name="userMd" size={14} color="#888" /><Text style={styles.metaText}>DocAvailable Team</Text></View>
          </View>
          <View style={styles.articleBody}>
            <Text style={styles.paragraph}>HIV is no longer a death sentence. With modern treatment, people with HIV can live long, healthy lives — often with a near-normal life expectancy. Here's what's changed and what you need to know.</Text>
            <Text style={styles.sectionTitle}>Early Symptoms (Acute HIV Infection)</Text>
            <Text style={styles.paragraph}>Within 2-4 weeks after exposure, some people (but not all) experience flu-like symptoms:</Text>
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="exclamationTriangle" size={14} color="#FF6B6B" /><Text style={styles.techniqueTitle}>Fever and Chills</Text></View>
              <Text style={styles.techniqueDescription}>Often the first sign, usually within 2-4 weeks of infection.</Text>
            </View>
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="exclamationTriangle" size={14} color="#FF6B6B" /><Text style={styles.techniqueTitle}>Rash</Text></View>
              <Text style={styles.techniqueDescription}>A red, non-itchy rash often appears on the torso.</Text>
            </View>
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="exclamationTriangle" size={14} color="#FF6B6B" /><Text style={styles.techniqueTitle}>Swollen Lymph Nodes</Text></View>
              <Text style={styles.techniqueDescription}>Particularly in the neck, armpits, or groin.</Text>
            </View>
            <Text style={styles.paragraph}>These symptoms often resolve on their own, which is why many people don't realize they have HIV. The virus then enters a "latent" stage where there may be no symptoms for years.</Text>
            <Text style={styles.sectionTitle}>Why Life Expectancy Has Changed</Text>
            <Text style={styles.paragraph}>Modern antiretroviral therapy (ART) has revolutionized HIV treatment:</Text>
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="checkCircle" size={14} color="#4CAF50" /><Text style={styles.techniqueTitle}>Viral Suppression</Text></View>
              <Text style={styles.techniqueDescription}>ART can reduce HIV in the blood to undetectable levels. When viral load is undetectable, HIV cannot be transmitted to others (U=U: Undetectable = Untransmittable).</Text>
            </View>
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="checkCircle" size={14} color="#4CAF50" /><Text style={styles.techniqueTitle}>Preserved Immune Function</Text></View>
              <Text style={styles.techniqueDescription}>Early treatment prevents HIV from destroying the immune system, preventing progression to AIDS.</Text>
            </View>
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="checkCircle" size={14} color="#4CAF50" /><Text style={styles.techniqueTitle}>One Pill a Day</Text></View>
              <Text style={styles.techniqueDescription}>Modern treatment is often just one pill once a day, with far fewer side effects than older medications.</Text>
            </View>
            <Text style={styles.sectionTitle}>Testing Is Critical</Text>
            <Text style={styles.paragraph}>Early diagnosis and treatment are key. The sooner someone starts ART, the better their long-term health. Everyone should get tested, especially if you've had unprotected sex or shared needles.</Text>
            <Text style={styles.sectionTitle}>Prevention: PrEP</Text>
            <Text style={styles.paragraph}>Pre-exposure prophylaxis (PrEP) is a daily pill that can prevent HIV infection in people at high risk. When taken consistently, it's 99% effective at preventing HIV.</Text>
            <Text style={styles.sectionTitle}>The Stigma Still Exists</Text>
            <Text style={styles.paragraph}>Despite medical advances, stigma remains the biggest barrier. Remember: HIV is a medical condition, not a moral judgment. With treatment, people with HIV can lead full, healthy lives.</Text>
            <View style={styles.bottomLineCard}>
              <Text style={styles.bottomLineTitle}>Bottom Line:</Text>
              <Text style={styles.bottomLineText}>HIV is manageable with modern treatment. People with HIV who take ART can live long, healthy lives and cannot transmit the virus to others when their viral load is undetectable. Get tested, know your status, and if positive, start treatment early. The future with HIV is much brighter than it used to be.</Text>
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

