import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const featuredBlogs = [
  {
    id: 1,
    title: 'The Doctor Will See You… Through Your Selfie Camera',
    description: 'Funny but real — emphasizes video consultations',
    image: require('../assets/images/video.jpg'),
    category: 'Telemedicine',
    date: '2024-01-15',
  },
  {
    id: 2,
    title: 'The Future of Healthcare: Telemedicine and AI',
    description: 'Explore the advantages of telemedicine and AI in healthcare.',
    image: require('../assets/images/ai.jpg'),
    category: 'Technology',
    date: '2024-01-10',
  },
  {
    id: 3,
    title: 'Your Phone = Your Doctor: 7 Health Services You Didn\'t Know You Could Get Online',
    description: 'Discover how your smartphone can provide essential healthcare services from the comfort of your home.',
    image: require('../assets/images/your phone.jpg'),
    category: 'Digital Health',
    date: '2024-01-05',
  },
];

const articles = [
  {
    id: 1,
    category: 'Mental Health',
    title: 'Coping with Stress and Anxiety: Tips to Manage It in Everyday Life',
    description: 'Stress and anxiety happen. Work, school, family—sometimes it all feels like too much. But small things done daily can help you stay in control.',
    image: require('../assets/images/stressed.jpg'),
    date: '2024-01-12',
  },
  {
    id: 2,
    category: 'Nutrition',
    title: 'Healthy Eating Habits for a Balanced Diet',
    description: 'Learn about the essential nutrients and foods for a healthy and balanced diet.',
    image: require('../assets/images/healthy diet.jpg'),
    date: '2024-01-08',
  },
  {
    id: 3,
    category: 'Fitness',
    title: 'From Couch to 5K: Building Fitness Habits That Actually Stick',
    description: 'Transform your fitness journey with practical tips and exercises that fit into your busy lifestyle.',
    image: require('../assets/images/marathon.jpg'),
    date: '2024-01-03',
  },
];

interface BlogProps {
  hideBottomNav?: boolean;
  headerContent?: React.ReactNode;
}

export default function Blog({ hideBottomNav, headerContent }: BlogProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [showSortOptions, setShowSortOptions] = useState(false);

  // Combine all blogs for search and sorting
  const allBlogs = [...featuredBlogs, ...articles];

  // Filter and sort blogs
  const getFilteredAndSortedBlogs = () => {
    let filteredBlogs = allBlogs;
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filteredBlogs = filteredBlogs.filter(blog => {
        const title = (blog.title || '').toLowerCase();
        const description = (blog.description || '').toLowerCase();
        const category = (blog.category || '').toLowerCase();
        return title.includes(query) || description.includes(query) || category.includes(query);
      });
    }

    // Sort blogs
    switch (sortBy) {
      case 'date':
        return filteredBlogs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      case 'title':
        return filteredBlogs.sort((a, b) => a.title.localeCompare(b.title));
      case 'category':
        return filteredBlogs.sort((a, b) => a.category.localeCompare(b.category));
      default:
        return filteredBlogs;
    }
  };

  const getSortOptionLabel = (value: string) => {
    switch (value) {
      case 'date': return 'Date (Newest)';
      case 'title': return 'Title (A-Z)';
      case 'category': return 'Category (A-Z)';
      default: return 'Sort by';
    }
  };

  const filteredAndSortedBlogs = getFilteredAndSortedBlogs();

  return (
    <View style={styles.container}>
      {/* Header (from parent) */}
      {headerContent}
      
      {/* Search Bar */}
      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#EAF4EC', borderRadius: 16, marginHorizontal: 16, marginBottom: 18, paddingHorizontal: 14, height: 44 }}>
        <FontAwesome name="search" size={20} color="#7CB18F" style={{ marginRight: 8 }} />
        <TextInput
          style={{ flex: 1, fontSize: 17, color: '#222', backgroundColor: 'transparent' }}
          placeholder="Search blogs by title, description, or category..."
          placeholderTextColor="#7CB18F"
          value={searchQuery}
          onChangeText={setSearchQuery}
          underlineColorAndroid="transparent"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={{ marginLeft: 8 }}>
            <FontAwesome name="times-circle" size={22} color="#7CB18F" />
          </TouchableOpacity>
        )}
      </View>

      {/* Sort Options */}
      <View style={styles.sortContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity 
            style={[styles.sortButton, sortBy === 'date' && styles.sortButtonActive]}
            onPress={() => setSortBy('date')}
          >
            <Text style={[styles.sortButtonText, sortBy === 'date' && styles.sortButtonTextActive]}>
              Date
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.sortButton, sortBy === 'title' && styles.sortButtonActive]}
            onPress={() => setSortBy('title')}
          >
            <Text style={[styles.sortButtonText, sortBy === 'title' && styles.sortButtonTextActive]}>
              Title
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.sortButton, sortBy === 'category' && styles.sortButtonActive]}
            onPress={() => setSortBy('category')}
          >
            <Text style={[styles.sortButtonText, sortBy === 'category' && styles.sortButtonTextActive]}>
              Category
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Search Results */}
        {searchQuery.trim() && (
          <View style={styles.searchResultsContainer}>
            <Text style={styles.searchResultsTitle}>
              Search Results ({filteredAndSortedBlogs.length})
            </Text>
            <View style={styles.searchResultsList}>
              {filteredAndSortedBlogs.map(blog => (
                <TouchableOpacity 
                  key={blog.id} 
                  style={styles.searchResultItem}
                  onPress={() => {
                    // Handle navigation based on blog ID
                    if (blog.id === 3) {
                      router.push('/blog-article');
                    } else if (blog.id === 1) {
                      router.push('/blog-article-2');
                    } else if (blog.id === 2) {
                      router.push('/blog-article-3');
                    } else {
                      Alert.alert('Coming Soon', 'This article will be available soon!');
                    }
                  }}
                >
                  <Image source={blog.image} style={styles.searchResultImage} />
                  <View style={styles.searchResultContent}>
                    <Text style={styles.searchResultCategory}>{blog.category}</Text>
                    <Text style={styles.searchResultTitle}>{blog.title}</Text>
                    <Text style={styles.searchResultDesc}>{blog.description}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Featured Blogs Horizontal Scroll (only show when not searching) */}
        {!searchQuery.trim() && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.featuredScroll}>
            {featuredBlogs.map(blog => (
              <TouchableOpacity 
                key={blog.id} 
                style={styles.featuredCard}
                onPress={() => {
                  if (blog.id === 3) {
                    router.push('/blog-article');
                  } else if (blog.id === 1) {
                    router.push('/blog-article-2');
                  } else if (blog.id === 2) {
                    router.push('/blog-article-3');
                  } else {
                    Alert.alert('Coming Soon', 'This article will be available soon!');
                  }
                }}
              >
                <Image source={blog.image} style={styles.featuredImage} />
                <Text style={styles.featuredTitle}>{blog.title}</Text>
                <Text style={styles.featuredDesc}>{blog.description}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Featured Articles Section (only show when not searching) */}
        {!searchQuery.trim() && (
          <>
            <Text style={styles.sectionHeader}>Featured Articles</Text>
            <View style={styles.articlesList}>
              {articles.map(article => (
                <TouchableOpacity 
                  key={article.id} 
                  style={styles.articleRow}
                  onPress={() => {
                    if (article.id === 1) {
                      router.push('/blog-article-4');
                    } else if (article.id === 2) {
                      router.push('/blog-article-5');
                    } else if (article.id === 3) {
                      router.push('/blog-article-6');
                    } else {
                      Alert.alert('Coming Soon', 'This article will be available soon!');
                    }
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.articleCategory}>{article.category}</Text>
                    <Text style={styles.articleTitle}>{article.title}</Text>
                    <Text style={styles.articleDesc}>{article.description}</Text>
                  </View>
                  <Image source={article.image} style={styles.articleImage} />
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
      </ScrollView>
      {/* Bottom Navigation */}
      {!hideBottomNav && (
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/')}> 
          <FontAwesome name="home" size={22} color="#222" />
          <Text style={styles.navLabel}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/my-appointments')}> 
          <FontAwesome name="calendar" size={22} color="#222" />
          <Text style={styles.navLabel}>Appointments</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/chat/123')}> 
          <FontAwesome name="comments" size={22} color="#222" />
          <Text style={styles.navLabel}>Messages</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.navItem, styles.activeNavItem]} onPress={() => router.push('/blog')}> 
          <FontAwesome name="newspaper-o" size={22} color="#4CAF50" />
          <Text style={[styles.navLabel, styles.activeNavLabel]}>Blog</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/patient-profile')}> 
          <FontAwesome name="user" size={22} color="#222" />
          <Text style={styles.navLabel}>Profile</Text>
        </TouchableOpacity>
      </View>
      )}
    </View>
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
    paddingBottom: 12,
    backgroundColor: '#F8F9FA',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#222',
  },
  featuredScroll: {
    paddingLeft: 20,
    marginBottom: 18,
  },
  featuredCard: {
    width: 220,
    backgroundColor: '#fff',
    borderRadius: 18,
    marginRight: 16,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  featuredImage: {
    width: '100%',
    height: 90,
    borderRadius: 12,
    marginBottom: 10,
    resizeMode: 'cover',
  },
  featuredTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 4,
  },
  featuredDesc: {
    fontSize: 13,
    color: '#666',
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
    marginLeft: 20,
    marginBottom: 12,
  },
  articlesList: {
    paddingHorizontal: 20,
  },
  articleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 18,
    marginBottom: 18,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  articleCategory: {
    fontSize: 13,
    color: '#888',
    marginBottom: 2,
  },
  articleTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 4,
  },
  articleDesc: {
    fontSize: 13,
    color: '#666',
  },
  articleImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    marginLeft: 14,
    resizeMode: 'cover',
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  navItem: {
    alignItems: 'center',
    flex: 1,
  },
  navLabel: {
    fontSize: 12,
    color: '#222',
    marginTop: 2,
  },
  activeNavItem: {},
  activeNavLabel: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  sortContainer: {
    marginBottom: 18,
  },
  sortButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: 'transparent',
  },
  sortButtonActive: {
    backgroundColor: '#7CB18F',
  },
  sortButtonText: {
    fontSize: 14,
    color: '#222',
    fontWeight: '500',
  },
  sortButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  searchResultsContainer: {
    paddingHorizontal: 20,
    marginBottom: 18,
  },
  searchResultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 12,
  },
  searchResultsList: {
    // No specific styles needed for the list
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 18,
    marginBottom: 12,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  searchResultImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    marginRight: 14,
    resizeMode: 'cover',
  },
  searchResultContent: {
    flex: 1,
  },
  searchResultCategory: {
    fontSize: 13,
    color: '#888',
    marginBottom: 2,
  },
  searchResultTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 4,
  },
  searchResultDesc: {
    fontSize: 13,
    color: '#666',
  },
}); 