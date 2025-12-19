import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '../components/Icon';

export default function BlogArticle19() {
  const router = useRouter();
  const [isBookmarked, setIsBookmarked] = useState(false);
  const handleShare = async () => {
    try {
      await Share.share({ message: 'Check out this great article from DocAvailable: Asthma Attacks Explained: Triggers, Symptoms, and Emergency Care', url: 'https://docavailable.com/blog/asthma-attacks-explained' });
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
        <Image source={require('../assets/images/articles/asthma.jpg')} style={styles.heroImage} />
        <View style={styles.articleContainer}>
          <Text style={styles.articleTitle}>Asthma Attacks Explained: Triggers, Symptoms, and Emergency Care</Text>
          <View style={styles.metaInfo}>
            <View style={styles.metaItem}><Icon name="calendar" size={14} color="#888" /><Text style={styles.metaText}>January 2024</Text></View>
            <View style={styles.metaItem}><Icon name="clock" size={14} color="#888" /><Text style={styles.metaText}>7 min read</Text></View>
            <View style={styles.metaItem}><Icon name="userMd" size={14} color="#888" /><Text style={styles.metaText}>DocAvailable Team</Text></View>
          </View>
          <View style={styles.articleBody}>
            <Text style={styles.paragraph}>When breathing becomes difficult, every second counts. Understanding asthma attacks — what triggers them, how to recognize them, and what to do — can save lives and prevent severe complications.</Text>
            <Text style={styles.sectionTitle}>What Is an Asthma Attack?</Text>
            <Text style={styles.paragraph}>During an asthma attack, the airways (bronchi) in your lungs become inflamed and swollen, and the muscles around them tighten. This narrows the airways, making it hard to breathe. Mucus production increases, further blocking airflow.</Text>
            <Text style={styles.sectionTitle}>Common Triggers</Text>
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="exclamationTriangle" size={14} color="#FF6B6B" /><Text style={styles.techniqueTitle}>Allergens</Text></View>
              <Text style={styles.techniqueDescription}>Pollen, dust mites, pet dander, mold spores, and cockroach droppings.</Text>
            </View>
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="exclamationTriangle" size={14} color="#FF6B6B" /><Text style={styles.techniqueTitle}>Irritants</Text></View>
              <Text style={styles.techniqueDescription}>Tobacco smoke, air pollution, strong odors (perfumes, cleaning products), and cold air.</Text>
            </View>
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="exclamationTriangle" size={14} color="#FF6B6B" /><Text style={styles.techniqueTitle}>Infections</Text></View>
              <Text style={styles.techniqueDescription}>Respiratory infections like colds, flu, or sinus infections can trigger attacks.</Text>
            </View>
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="exclamationTriangle" size={14} color="#FF6B6B" /><Text style={styles.techniqueTitle}>Physical Activity</Text></View>
              <Text style={styles.techniqueDescription}>Exercise-induced asthma, especially in cold or dry air.</Text>
            </View>
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="exclamationTriangle" size={14} color="#FF6B6B" /><Text style={styles.techniqueTitle}>Stress and Emotions</Text></View>
              <Text style={styles.techniqueDescription}>Strong emotions, laughing, crying, or stress can trigger symptoms.</Text>
            </View>
            <Text style={styles.sectionTitle}>Warning Signs of an Attack</Text>
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="exclamationTriangle" size={14} color="#FF6B6B" /><Text style={styles.techniqueTitle}>Early Signs</Text></View>
              <Text style={styles.techniqueDescription}>Frequent coughing (especially at night), shortness of breath, chest tightness, wheezing, and feeling tired or weak.</Text>
            </View>
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="exclamationTriangle" size={14} color="#FF0000" /><Text style={styles.techniqueTitle}>Severe Attack Signs</Text></View>
              <Text style={styles.techniqueDescription}>Severe shortness of breath, rapid breathing, inability to speak full sentences, blue lips or fingernails, chest pain, and using neck/chest muscles to breathe. These require immediate emergency care.</Text>
            </View>
            <Text style={styles.sectionTitle}>Emergency Care: What to Do</Text>
            <Text style={styles.paragraph}>If someone is having a severe asthma attack:{'\n'}1. Help them use their rescue inhaler (usually a bronchodilator) if they have one{'\n'}2. Sit them upright and stay calm{'\n'}3. Loosen tight clothing{'\n'}4. If symptoms don't improve within minutes, or worsen, call emergency services immediately{'\n'}5. Continue using the inhaler every 15-20 minutes if needed while waiting for help</Text>
            <Text style={styles.sectionTitle}>Prevention and Management</Text>
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="checkCircle" size={14} color="#4CAF50" /><Text style={styles.techniqueTitle}>Know Your Triggers</Text></View>
              <Text style={styles.techniqueDescription}>Identify and avoid your triggers. Keep a diary to track what sets off your asthma.</Text>
            </View>
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="checkCircle" size={14} color="#4CAF50" /><Text style={styles.techniqueTitle}>Take Medications as Prescribed</Text></View>
              <Text style={styles.techniqueDescription}>Use controller medications daily to prevent attacks, and always carry a rescue inhaler for emergencies.</Text>
            </View>
            <View style={styles.techniqueCard}>
              <View style={styles.techniqueHeader}><Icon name="checkCircle" size={14} color="#4CAF50" /><Text style={styles.techniqueTitle}>Have an Action Plan</Text></View>
              <Text style={styles.techniqueDescription}>Work with your doctor to create a written asthma action plan that tells you what medications to take and when to seek emergency care.</Text>
            </View>
            <View style={styles.bottomLineCard}>
              <Text style={styles.bottomLineTitle}>Bottom Line:</Text>
              <Text style={styles.bottomLineText}>Asthma attacks can be scary, but knowing your triggers, recognizing warning signs, and having an action plan can help prevent severe attacks. If someone has severe breathing difficulty (can't speak, blue lips, rapid breathing), call emergency services immediately. Quick action saves lives.</Text>
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

