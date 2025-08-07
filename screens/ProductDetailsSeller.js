
import React, { useEffect, useState, useLayoutEffect } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  doc,
  getDoc,
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import { AntDesign } from '@expo/vector-icons';

const formatMoney = (n) => `$${Number(n || 0).toFixed(2)}`;

export default function SellerDetailsScreen({ route, navigation }) {
  const { productId } = route.params || {};
  const [product, setProduct] = useState(null);
  const [seller, setSeller] = useState(null);
  const [latestComment, setLatestComment] = useState(null);
  const [loading, setLoading] = useState(true);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  useEffect(() => {
    const fetchProductAndSeller = async () => {
      try {
        const prodRef = doc(db, 'products', productId);
        const prodSnap = await getDoc(prodRef);
        if (!prodSnap.exists()) throw new Error('Product not found');
        const data = prodSnap.data();
        setProduct({ id: prodSnap.id, ...data });

        if (data.sellerId) {
          const sellerRef = doc(db, 'users', data.sellerId);
          const sellerSnap = await getDoc(sellerRef);
          if (sellerSnap.exists()) {
            setSeller({ id: sellerSnap.id, ...sellerSnap.data() });
          }
        }
      } catch (e) {
        Alert.alert('Error', e.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProductAndSeller();
  }, [productId]);

  useEffect(() => {
    if (!productId) return;
    const commentsRef = collection(db, 'products', productId, 'comments');
    const q = query(commentsRef, orderBy('createdAt', 'desc'), limit(1));
    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        setLatestComment(snap.docs[0].data());
      } else {
        setLatestComment(null);
      }
    });
    return () => unsub();
  }, [productId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 8 }}>Loading details...</Text>
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.center}>
        <Text>Product not found.</Text>
      </View>
    );
  }

  const inStock = product.isActive && (product.stock ?? 0) > 0;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#fff' }}
      behavior={Platform.select({ ios: 'padding' })}
    >
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <View style={styles.topRow}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <AntDesign name="arrowleft" size={24} />
          </TouchableOpacity>
        </View>

        {/* Image */}
        <View style={styles.imageWrapper}>
          <Image source={{ uri: product.imageUrl }} style={styles.image} />
        </View>

        {/* Title / info */}
        <Text style={styles.title}>{product.title}</Text>
        <Text style={styles.category}>
          {product.category} / {product.subCategory}
        </Text>

        <View style={styles.row}>
          <Text style={styles.price}>{formatMoney(product.price)}</Text>
          <View style={[styles.badge, inStock ? styles.inStock : styles.outStock]}>
            <Text style={styles.badgeText}>
              {inStock ? 'In Stock' : 'Out of Stock'}
            </Text>
          </View>
        </View>
        <Text style={styles.stock}>{product.stock ?? 0} available</Text>

        {/* Description */}
        <View style={styles.card}>
          <Text style={styles.heading}>Description</Text>
          <Text style={styles.text}>
            {product.description || 'No description provided.'}
          </Text>
        </View>

        {/* Seller */}
        <View style={styles.card}>
          <Text style={styles.heading}>Seller</Text>
          <View style={styles.sellerRow}>
            <View style={styles.avatar}>
              <Text style={{ fontWeight: '700', color: '#fff' }}>
                {seller?.name ? seller.name[0].toUpperCase() : '?'}
              </Text>
            </View>
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={styles.sellerName}>
                {seller?.name || product.sellerName || 'Unknown'}
              </Text>
              <Text style={styles.sellerRole}>Seller</Text>
            </View>
          </View>
        </View>

        {/* Latest Comment */}
        <View style={styles.card}>
          <Text style={styles.heading}>Latest Comment</Text>
          {latestComment ? (
            <View style={styles.commentPreview}>
              <Text style={styles.commentName}>{latestComment.userName}</Text>
              <Text numberOfLines={2} style={styles.text}>
                {latestComment.text}
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('Comments', { productId })}
              >
                <Text style={styles.link}>View all / Add comment</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={styles.text}>No comments yet.</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('Comments', { productId })}
              >
                <Text style={styles.link}>Be the first to comment</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 120, backgroundColor: '#f9f9f9' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
    marginTop: 20,
  },
  imageWrapper: {
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#fff',
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
  },
  image: {
    width: '100%',
    height: 260,
    resizeMode: 'cover',
  },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 4 },
  category: { fontSize: 14, color: '#666', marginBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  price: { fontSize: 22, fontWeight: '700', color: '#222' },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  inStock: { backgroundColor: '#e6f7ec' },
  outStock: { backgroundColor: '#ffe9e9' },
  badgeText: { fontSize: 12, fontWeight: '600', color: '#007a00' },
  stock: { fontSize: 13, color: '#555', marginTop: 4, marginBottom: 12 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 8,
  },
  heading: { fontSize: 18, fontWeight: '600', marginBottom: 6 },
  text: { fontSize: 14, lineHeight: 20, color: '#333' },
  link: { color: '#007aff', fontWeight: '600', marginTop: 6 },
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#007aff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sellerName: { fontSize: 16, fontWeight: '600' },
  sellerRole: { fontSize: 12, color: '#666', marginTop: 2 },
  commentPreview: {
    backgroundColor: '#f3f3f3',
    borderRadius: 10,
    padding: 12,
    marginTop: 4,
  },
  commentName: { fontWeight: '700', marginBottom: 4, fontSize: 14 },
});
