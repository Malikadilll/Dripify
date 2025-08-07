
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Dimensions,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';

import BrandIcons from './BrandIcons'; // Assuming you have a BrandIcons component

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function HomeScreen({ navigation }) {
  const [products, setProducts] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showAll, setShowAll] = useState(false);

  const carouselRef = useRef(null);
  const [carouselIndex, setCarouselIndex] = useState(0);

  // Auto rotate carousel
  useEffect(() => {
    if (featuredProducts.length === 0) return;

    const interval = setInterval(() => {
      const nextIndex = (carouselIndex + 1) % featuredProducts.length;
      setCarouselIndex(nextIndex);
      carouselRef.current?.scrollToIndex({ index: nextIndex, animated: true });
    }, 2000);

    return () => clearInterval(interval);
  }, [carouselIndex, featuredProducts]);

  const fetchProducts = useCallback(() => {
    setLoading(true);
    const productsRef = collection(db, 'products');
    const q = query(
      productsRef,
      where('isActive', '==', true),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setProducts(items);
        setLoading(false);
        setRefreshing(false);
      },
      (err) => {
        console.error('Failed to fetch products', err);
        Alert.alert('Error', 'Could not load products.');
        setLoading(false);
        setRefreshing(false);
      }
    );

    return unsubscribe;
  }, []);

  const fetchFeaturedProducts = useCallback(() => {
    const productsRef = collection(db, 'products');
    const q = query(
      productsRef,
      where('isActive', '==', true),
      where('isFeatured', '==', true),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setFeaturedProducts(items);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsub1 = fetchProducts();
    const unsub2 = fetchFeaturedProducts();
    return () => {
      if (typeof unsub1 === 'function') unsub1();
      if (typeof unsub2 === 'function') unsub2();
    };
  }, [fetchProducts, fetchFeaturedProducts]);

  useEffect(() => {
    let data = [...products];

    if (selectedCategory) {
      data = data.filter(
        (p) => p.category?.toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    if (searchText) {
      const lower = searchText.toLowerCase();
      data = data.filter(
        (p) =>
          p.title?.toLowerCase().includes(lower) ||
          p.category?.toLowerCase().includes(lower) ||
          p.subCategory?.toLowerCase().includes(lower) ||
          p.sellerName?.toLowerCase().includes(lower)
      );
    }

    setFilteredProducts(data);
  }, [searchText, products, selectedCategory]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProducts();
    fetchFeaturedProducts();
  };

  const categoryData = [
    { name: 'Upper', icon: 'shirt-outline' },
    { name: 'Bottom', icon: 'walk-outline' },
    { name: 'Suits', icon: 'business-outline' },
    { name: 'Shoes', icon: 'basketball-outline' },
    { name: 'Accessories', icon: 'watch-outline' },
  ];

  const handleCategoryPress = (category) => {
    if (selectedCategory === category) {
      setSelectedCategory(null);
    } else {
      setSelectedCategory(category);
    }
    setShowAll(false);
  };

  const renderCategory = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.categoryCard,
        selectedCategory === item.name && styles.categorySelected,
      ]}
      onPress={() => handleCategoryPress(item.name)}
    >
      <View style={styles.categoryIconWrapper}>
        <Ionicons name={item.icon} size={22} />
      </View>
      <Text numberOfLines={1} style={styles.categoryName}>
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  const renderGridProduct = ({ item }) => (
    <TouchableOpacity
      style={styles.gridCard}
      onPress={() =>
        navigation.navigate('SellerProductDetails', { productId: item.id })
      }
    >
      <Image source={{ uri: item.imageUrl }} style={styles.gridImage} />
      <Text numberOfLines={1} style={styles.gridTitle}>{item.title}</Text>
      <Text style={styles.gridPrice}>${(item.price ?? 0).toFixed(2)}</Text>
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 8 }}>Loading home...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.body}>
      <FlatList
        data={showAll ? filteredProducts : filteredProducts.slice(0, 9)}
        keyExtractor={(i) => i.id}
        numColumns={3}
        columnWrapperStyle={{ justifyContent: 'space-between' }}
        renderItem={renderGridProduct}
        contentContainerStyle={{ padding: 12, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListHeaderComponent={
          <>
             <TouchableOpacity
                      style={styles.messageIcon}
                      onPress={() => navigation.navigate('ChatList')}
                    >
                      <Ionicons style={styles.message} name="chatbubbles" />
                    </TouchableOpacity>
            
                    {/* Centered Heading */}
                    <Text style={styles.greeting}>
                      Welcome to <Text style={styles.dripify}>Dripify</Text>
                    </Text>

            {/* Search */}
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} style={{ marginLeft: 8 }} />
              <TextInput
                placeholder="Search products, categories, sellers..."
                style={styles.searchInput}
                value={searchText}
                onChangeText={setSearchText}
                returnKeyType="search"
              />
              {searchText ? (
                <TouchableOpacity onPress={() => setSearchText('')}>
                  <Ionicons
                    name="close-circle"
                    size={20}
                    style={{ marginRight: 8 }}
                  />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Auto-Rotating Carousel */}
            <View style={{ marginTop: 16 }}>
              <Text style={styles.sectionTitle}>Featured</Text>
              {featuredProducts.length > 0 ? (
                <FlatList
                  ref={carouselRef}
                  data={featuredProducts}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  pagingEnabled
                  keyExtractor={(i) => i.id}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.carouselCard}
                      onPress={() =>
                        navigation.navigate('SellerProductDetails', { productId: item.id })
                      }
                    >
                      <Image
                        source={{ uri: item.imageUrl }}
                        style={styles.carouselImage}
                      />
                      <View style={styles.carouselOverlay}>
                        <Text numberOfLines={1} style={styles.carouselTitle}>
                          {item.title}
                        </Text>
                        <Text style={styles.carouselPrice}>
                          ${(item.price ?? 0).toFixed(2)}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  )}
                  ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
                  contentContainerStyle={{ paddingHorizontal: 4 }}
                  onScrollToIndexFailed={() => {}}
                />
              ) : (
                <Text style={{ paddingHorizontal: 4, color: '#666' }}>
                  No featured products.
                </Text>
              )}
            </View>
              <BrandIcons/>
            {/* Categories */}
            <View style={{ marginTop: 24 }}>
              <Text style={styles.sectionTitle}>
                {selectedCategory ? selectedCategory : 'All Products'}
              </Text>
              <FlatList
                data={categoryData}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(i) => i.name}
                renderItem={renderCategory}
                ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
                contentContainerStyle={{ paddingVertical: 8 }}
              />
            </View>

            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Text style={[styles.sectionTitle, { marginTop: 28 }]}>
                {selectedCategory ? selectedCategory : 'All Products'}
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate('SellerProductDetails')}>
                <Text style={{ marginTop: 28 }}></Text>
              </TouchableOpacity>
            </View>
          </>
        }
        ListFooterComponent={
          filteredProducts.length > 9 ? (
            <TouchableOpacity
              style={styles.viewAllButton}
              onPress={() => setShowAll(!showAll)}
            >
              <Text style={styles.viewAllText}>
                {showAll ? 'Show Less' : 'View All'}
              </Text>
            </TouchableOpacity>
          ) : null
        }
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  body: { backgroundColor: '#fff', flex: 1 },
  greeting: {
  textAlign: 'center',
  fontSize: 18,
  fontWeight: '500',
  marginTop: 20,
  marginBottom:12,
},

dripify: {
  fontSize: 24,
  fontWeight: '700',
  marginBottom: 12,
  paddingHorizontal: 4,
  color: "#00b05b",
  marginTop: 20,
  textAlign: "center",
},

drip: {
  fontSize: 22,
},
message:{
  fontSize: 30,
  color: '#00b05b',
},
messageIcon: {
  position: 'absolute',
  top: 24, // adjust as needed
  right: 16,
  zIndex: 20,
},
  sectionTitle: { fontSize: 20, fontWeight: '600', marginBottom: 8, paddingHorizontal: 4 },
  searchContainer: {
    flexDirection: 'row',
    backgroundColor: '#f1f3f6',
    borderRadius: 10,
    alignItems: 'center',
    height: 44,
    marginBottom: 12,
  },
  searchInput: { flex: 1, paddingHorizontal: 8, fontSize: 14 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  carouselCard: {
    width: SCREEN_WIDTH * 0.75,
    height: 160,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#eee',
  },
  carouselImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  carouselOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  carouselTitle: { color: '#fff', fontSize: 16, fontWeight: '600' },
  carouselPrice: { color: '#fff', marginTop: 4, fontSize: 14, fontWeight: '500' },
  categoryCard: {
    backgroundColor: '#fdfeffff',
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
    minWidth: 80,
    elevation: 1,
  },
  categorySelected: { borderColor: '#000', borderWidth: 1 },
  categoryIconWrapper: { backgroundColor: '#f1f3f6', padding: 8, borderRadius: 8, marginBottom: 6 },
  categoryName: { fontSize: 12, fontWeight: '500' },
  gridCard: {
    backgroundColor: '#fdfeffff',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
    width: '32%',
    marginBottom: 12,
    elevation: 1,
  },
  gridImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 6,
    resizeMode: 'cover',
  },
  gridTitle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
    textAlign: 'center',
  },
  gridPrice: {
    fontSize: 12,
    fontWeight: '700',
    color: '#222',
    marginTop: 2,
  },
  viewAllButton: {
    backgroundColor: '#000',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  viewAllText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
