
import React, { useEffect, useState, useLayoutEffect, useCallback } from 'react';
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
  Modal,
} from 'react-native';
import {
  doc,
  getDoc,
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  addDoc,
  getDocs,
  updateDoc,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import { AntDesign } from '@expo/vector-icons';

const getUserCartRef = (uid) => collection(db, 'users', uid, 'cart');
const formatMoney = (n) => `$${Number(n || 0).toFixed(2)}`;

export default function ProductDetailsScreen({ route, navigation }) {
  const { productId } = route.params || {};
  const [product, setProduct] = useState(null);
  const [seller, setSeller] = useState(null);
  const [latestComment, setLatestComment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [activeOrder, setActiveOrder] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [cancellingOrder, setCancellingOrder] = useState(false);
  const [confirmingPurchase, setConfirmingPurchase] = useState(false);
  const [userAddress, setUserAddress] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  const user = auth.currentUser;

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  /** Fetch product and seller */
  useEffect(() => {
    const fetchProduct = async () => {
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
        setErrorMessage('Error, '+ e.message);
      } finally {
        setLoading(false);
      }
    };
    


    fetchProduct();
  }, [productId]);

  const fetchUserAddress = async () => {
  if (!user) return;
  try {
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const data = userSnap.data();
      setUserAddress(data.address || 'No address saved');
    }
  } catch (e) {
    console.warn('Failed to fetch user address:', e);
  }
};
  /** Fetch active order */
  const fetchActiveOrder = useCallback(async () => {
    if (!user || !productId) return;
    try {
      const q = query(
        collection(db, 'orders'),
        where('buyerId', '==', user.uid),
        where('productId', '==', productId),
        where('status', 'in', ['pending', 'confirmed'])
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const docSnap = snap.docs[0];
        setActiveOrder({ id: docSnap.id, ...docSnap.data() });
      } else {
        setActiveOrder(null);
      }
    } catch (e) {
      console.warn('Failed to fetch active order:', e);
    }
  }, [productId, user]);

  useEffect(() => {
    fetchActiveOrder();
  }, [fetchActiveOrder]);

  /** Subscribe to latest comment */
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

  const adjustQuantity = (delta) => {
    setQuantity((q) => Math.max(1, q + delta));
  };

  /** Place or revive order */
  const handlePlaceOrder = async () => {
    if (!user || !product) return;

    if (quantity <= 0) {
      setErrorMessage('Invalid Quantity, '+ 'Quantity must be at least 1.');
      return;
    }
    if ((product.stock ?? 0) < quantity) {
      setErrorMessage('Insufficient Stock, '+ `Only ${product.stock} available.`);
      return;
    }

    setPlacingOrder(true);
    try {
      const buyerId = user.uid;

      const cancelledQuery = query(
        collection(db, 'orders'),
        where('buyerId', '==', buyerId),
        where('productId', '==', product.id),
        where('status', '==', 'cancelled')
      );
      const cancelledSnap = await getDocs(cancelledQuery);

      if (!cancelledSnap.empty) {
        // revive cancelled order
        const docId = cancelledSnap.docs[0].id;
        await updateDoc(doc(db, 'orders', docId), {
          status: 'pending',
          createdAt: serverTimestamp(),
          quantity,
          price: product.price,
          title: product.title,
          imageUrl: product.imageUrl,
        });
      } else {
        // new order
        const order = {
          buyerId,
          sellerId: product.sellerId,
          productId: product.id,
          price: product.price,
          title: product.title,
          imageUrl: product.imageUrl,
          createdAt: serverTimestamp(),
          status: 'pending',
          quantity,
        };
        await addDoc(collection(db, 'orders'), order);
      }

      
      await fetchActiveOrder();
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setPlacingOrder(false);
    }
  };

  /** Begin cancellation (opens modal) */
  const beginCancel = () => {
    if (!activeOrder) return;
    setConfirmingCancel(true);
  };

  /** Confirm cancellation */
  const handleCancelOrder = async () => {
    if (!activeOrder) return;

    setCancellingOrder(true);
    try {
      await updateDoc(doc(db, 'orders', activeOrder.id), {
        status: 'cancelled',
        updatedAt: serverTimestamp(),
      });
      
      setActiveOrder(null);
    } catch (e) {
      setErrorMessage('Error, '+ 'Failed to cancel order.');
    } finally {
      setCancellingOrder(false);
      setConfirmingCancel(false);
    }
  };

  /** Add to cart */
  const handleAddToCart = async () => {
    if (!user || !product) return;
    if (quantity <= 0) {
      setErrorMessage('Invalid Quantity, '+ 'Quantity must be at least 1.');
      return;
    }
    if ((product.stock ?? 0) < quantity) {
      setErrorMessage('Insufficient Stock, '+ `Only ${product.stock} available.`);
      return;
    }

    setAddingToCart(true);
    try {
      const uid = user.uid;
      const cartRef = getUserCartRef(uid);
      const existingQuery = query(cartRef, where('productId', '==', product.id));
      const existingSnap = await getDocs(existingQuery);

      if (!existingSnap.empty) {
        const docSnap = existingSnap.docs[0];
        const existing = docSnap.data();
        const newQty = (existing.quantity || 0) + quantity;
        if ((product.stock ?? 0) < newQty) {
          setErrorMessage('Insufficient Stock, '+ `Cannot add more than ${product.stock} total.`);
        } else {
          await updateDoc(doc(db, 'users', uid, 'cart', docSnap.id), {
            quantity: newQty,
            updatedAt: serverTimestamp(),
          });
          setErrorMessage('Cart updated, '+ 'Quantity increased in cart.');
        }
      } else {
        const cartItem = {
          productId: product.id,
          title: product.title,
          imageUrl: product.imageUrl,
          price: product.price,
          sellerId: product.sellerId,
          quantity,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        await addDoc(cartRef, cartItem);
        setErrorMessage('Added to Cart, '+ `${product.title} added successfully.`);
      }
    } catch (e) {
      setErrorMessage('Error, '+ e.message);
    } finally {
      setAddingToCart(false);
    }
  };

  const handleContactSeller = () => {
    if (seller?.phone) {
   
      navigation.navigate('ChatScreen', {
  senderId: user.uid,
  receiverId: product.sellerId,
});


    } else {
      setErrorMessage('No contact info available');
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 8 }}>Loading product...</Text>
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
  const hasActiveOrder = !!activeOrder;

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
          <View style={{ flex: 1 }} />
          <TouchableOpacity onPress={() => navigation.navigate('Cart')} />
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
          <Text style={styles.text}>{product.description || 'No description provided.'}</Text>
        </View>

        {/* Seller */}
        <View style={styles.card}>
          <Text style={styles.heading}>Seller</Text>
          <TouchableOpacity
            style={styles.sellerRow}
            onPress={() =>
              Alert.alert('Seller', seller?.name || product.sellerName || 'Unknown')
            }
          >
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
            <TouchableOpacity onPress={handleContactSeller}>
              <Text style={styles.contactLink}>Contact</Text>
            </TouchableOpacity>
          </TouchableOpacity>
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

        {/* Quantity selector */}
        <View style={styles.card}>
          <Text style={styles.heading}>Quantity</Text>
          <View style={styles.qtyRow}>
            <TouchableOpacity
              style={styles.qtyBtn}
              onPress={() => adjustQuantity(-1)}
              disabled={quantity <= 1}
            >
              <AntDesign name="minus" size={16} />
            </TouchableOpacity>
            <Text style={styles.qtyText}>{quantity}</Text>
            <TouchableOpacity style={styles.qtyBtn} onPress={() => adjustQuantity(1)}>
              <AntDesign name="plus" size={16} />
            </TouchableOpacity>
            <Text style={styles.subtotal}>
              Subtotal: {formatMoney((product.price || 0) * quantity)}
            </Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionGroup}>
          {hasActiveOrder ? (
            <>
              <TouchableOpacity
                style={[styles.primaryButton, styles.cancelBtn]}
                onPress={beginCancel}
              >
                <Text style={styles.primaryText}>Cancel Order</Text>
              </TouchableOpacity>
              
            </>
          ) : (
            <TouchableOpacity
              style={[
                styles.primaryButton,
                (!inStock || placingOrder) && styles.disabledBtn,
              ]}
                        onPress={async () => {
            await fetchUserAddress();
            setConfirmingPurchase(true);
          }}

              disabled={!inStock || placingOrder}
            >
              <Text style={styles.primaryText}>
                {placingOrder
                  ? 'Placing Order...'
                  : `Buy Now for ${formatMoney(product.price * quantity)}`}
              </Text>
            </TouchableOpacity>
          )}
            {errorMessage ? (
              <Text style={styles.errorText}>{errorMessage}</Text>
            ) : null}

          <TouchableOpacity
            style={[styles.secondaryButton, (!inStock || addingToCart) && styles.disabledOutline]}
            onPress={handleAddToCart}
            disabled={!inStock || addingToCart}
          >
            <Text style={styles.secondaryText}>
              {addingToCart ? 'Adding...' : 'Add to Cart'}
            </Text>
          </TouchableOpacity>

          <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
            <TouchableOpacity
              style={styles.outlineSmall}
              onPress={() => navigation.navigate('Cart')}
            >
              <Text style={styles.outlineSmallText}>Go to Cart</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.outlineSmall} onPress={handleContactSeller}>
              <Text style={styles.outlineSmallText}>Contact Seller</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Cancel Confirmation Modal */}
      <Modal visible={confirmingCancel} transparent animationType="slide">
        <View style={modalStyles.backdrop}>
          <View style={modalStyles.content}>
            <View style={modalStyles.header}>
              <Text style={modalStyles.title}>Cancel Order</Text>
              <TouchableOpacity onPress={() => setConfirmingCancel(false)}>
                <AntDesign name="close" size={20} />
              </TouchableOpacity>
            </View>
            <Text style={modalStyles.bodyText}>
              Are you sure you want to cancel "{activeOrder?.title}"?
            </Text>
            <View style={modalStyles.buttonsRow}>
              <TouchableOpacity
                style={[modalStyles.secondaryButton, { flex: 1 }]}
                onPress={() => setConfirmingCancel(false)}
                disabled={cancellingOrder}
              >
                <Text style={modalStyles.secondaryText}>No</Text>
              </TouchableOpacity>
              <View style={{ width: 12 }} />
              <TouchableOpacity
                style={[modalStyles.primaryButton, { flex: 1, backgroundColor: '#d9534f' }]}
                onPress={handleCancelOrder}
                disabled={cancellingOrder}
              >
                <Text style={modalStyles.primaryText}>
                  {cancellingOrder ? 'Cancelling...' : 'Yes, Cancel'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Purchase Confirmation Modal */}
      <Modal visible={confirmingPurchase} transparent animationType="slide">
        <View style={modalStyles.backdrop}>
          <View style={modalStyles.content}>
            <View style={modalStyles.header}>
              <Text style={modalStyles.title}>Confirm Purchase</Text>
              <TouchableOpacity onPress={() => setConfirmingPurchase(false)}>
                <AntDesign name="close" size={20} />
              </TouchableOpacity>
            </View>

            <Text style={modalStyles.bodyText}>Confirm your shipping address:</Text>
            <Text style={[modalStyles.bodyText, { marginTop: 8, fontWeight: '600' }]}>
              {userAddress || 'No address found.'}
            </Text>

            <View style={modalStyles.buttonsRow}>
              <TouchableOpacity
                style={[modalStyles.secondaryButton, { flex: 1 }]}
                onPress={() => setConfirmingPurchase(false)}
              >
                <Text style={modalStyles.secondaryText}>Cancel</Text>
              </TouchableOpacity>

              <View style={{ width: 12 }} />

              <TouchableOpacity
                style={[modalStyles.primaryButton, { flex: 1, backgroundColor: '#00b05b' }]}
                onPress={async () => {
                  setConfirmingPurchase(false);
                  await handlePlaceOrder();
                }}
              >
                <Text style={modalStyles.primaryText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </KeyboardAvoidingView>
  );
}

const commonButtonText = { fontWeight: '700', fontSize: 16 };

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
  errorText: {
  color: 'greyS',
  textAlign: 'center',
  marginBottom: 16,
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
  contactLink: { color: '#007aff', fontWeight: '600' },
  commentPreview: {
    backgroundColor: '#f3f3f3',
    borderRadius: 10,
    padding: 12,
    marginTop: 4,
  },
  commentName: { fontWeight: '700', marginBottom: 4, fontSize: 14 },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
    marginTop: 6,
  },
  qtyBtn: {
    borderWidth: 1,
    borderColor: '#d1d1d6',
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  qtyText: { fontSize: 16, fontWeight: '600', minWidth: 32, textAlign: 'center' },
  subtotal: { fontSize: 14, fontWeight: '600', marginLeft: 8 },
  actionGroup: { marginTop: 8 },
  primaryButton: {
    backgroundColor: '#00b05b',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  cancelBtn: {
    backgroundColor: '#FF3B30',
  },
  primaryText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#007aff',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryText: { color: '#007aff', fontWeight: '600', fontSize: 15 },
  outlineSmall: {
    borderWidth: 1,
    borderColor: '#ccc',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginRight: 8,
    marginTop: 4,
  },
  outlineSmallText: { fontSize: 13, color: '#444' },
  disabledBtn: { opacity: 0.6 },
  disabledOutline: { opacity: 0.6 },
});

const modalStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    padding: 20,
  },
  content: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 20,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: { fontSize: 18, fontWeight: '700' },
  bodyText: { marginTop: 8, fontSize: 14, color: '#333' },
  buttonsRow: { flexDirection: 'row', marginTop: 18 },
  primaryButton: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryText: { color: '#fff', fontWeight: '700' },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#888',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  secondaryText: { color: '#444', fontWeight: '600' },
});
