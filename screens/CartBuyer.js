
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Image,
  Modal
} from 'react-native';
import {
  collection,
  query,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  getDoc,
  writeBatch,
  serverTimestamp,
  getDocs,
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import { AntDesign, MaterialIcons } from '@expo/vector-icons';

const PROMOS = {
  ADJ3AK: { type: 'percent', amount: 40 }, // 40% off
};

const DELIVERY_FEE = 5.0;

const formatMoney = (n) => `$${n.toFixed(2)}`;

const CartItem = ({ item, onRemove, onChangeQty }) => {
  const quantity = item.quantity ?? 1;
  const price = Number(item.price ?? 0);
  const subtotal = price * quantity;

  const inc = () => onChangeQty(item, quantity + 1);
  const dec = () => {
    if (quantity > 1) onChangeQty(item, quantity - 1);
  };

  return (
    <View style={styles.cartCard}>
      <View style={styles.imageWrapper}>
        {item.imageUrl ? (
          <View style={styles.imagePlaceholder}>
            <ImageFallback uri={item.imageUrl} />
          </View>
        ) : (
          <View style={[styles.imagePlaceholder, { justifyContent: 'center' }]}>
            <Text style={{ fontSize: 12, color: '#666' }}>No Image</Text>
          </View>
        )}
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{item.title}</Text>
        {item.variant ? (
          <Text style={styles.variant}>{item.variant}</Text>
        ) : null}
        <Text style={styles.price}>{formatMoney(price)}</Text>
        <View style={styles.qtyRow}>
          <View style={styles.qtyControls}>
            <TouchableOpacity onPress={dec} style={styles.qtyBtn}>
              <AntDesign name="minus" size={14} />
            </TouchableOpacity>
            <Text style={styles.qtyText}>{quantity}</Text>
            <TouchableOpacity onPress={inc} style={styles.qtyBtn}>
              <AntDesign name="plus" size={14} />
            </TouchableOpacity>
          </View>
          <Text style={styles.subtotal}>{formatMoney(subtotal)}</Text>
        </View>
      </View>
      <TouchableOpacity onPress={() => onRemove(item)} style={styles.removeBtn}>
        <MaterialIcons name="close" size={20} color="#444" />
      </TouchableOpacity>
    </View>
  );
};

// lightweight image component with fallback (no external libs)
const ImageFallback = ({ uri, style }) => {
  return (
    <View style={[{ width: 64, height: 64, borderRadius: 8, overflow: 'hidden' }, style]}>
      <Image
        source={{ uri }}
        style={{ width: '100%', height: '100%' }}
        resizeMode="cover"
        
      />
    </View>
  );
};

export default function CartScreen({ navigation }) {
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [promoInput, setPromoInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [userAddress, setUserAddress] = useState(null);
  const [confirmingCheckout, setConfirmingCheckout] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  

  const uid = auth.currentUser?.uid;

  const computeSubtotal = useCallback((items) => {
    return items.reduce((sum, it) => sum + (Number(it.price) || 0) * (it.quantity || 0), 0);
  }, []);

  const applyPromoCode = () => {
    const code = promoInput.trim().toUpperCase();
    if (!code) return;
    if (PROMOS[code]) {
      setAppliedPromo({ code, ...PROMOS[code] });
    } else {
      setErrorMessage('Invalid promo, '+ 'That promo code is not recognized.');
    }
  };

  const clearPromo = () => {
    setAppliedPromo(null);
    setPromoInput('');
  };

  useEffect(() => {
    if (!uid) return;
    setLoading(true);
    const cartRef = collection(db, 'users', uid, 'cart');
    const unsub = onSnapshot(
      cartRef,
      (snap) => {
        const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setCartItems(items);
        setLoading(false);
        setRefreshing(false);
      },
      (err) => {
        setErrorMessage('Error syncing cart, '+ err.message);
        setLoading(false);
        setRefreshing(false);
      }
    );
    return () => unsub();
  }, [uid]);

  const onRefresh = () => {
    if (!uid) return;
    setRefreshing(true);
    // force re-fetch by temporarily unsubscribing / relying on snapshot; we can fallback to a manual query
    const cartRef = collection(db, 'users', uid, 'cart');
    getDocs(cartRef)
      .then((snap) => {
        const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setCartItems(items);
      })
      .catch((e) => setErrorMessage('Refresh failed, '+ e.message))
      .finally(() => setRefreshing(false));
  };

  const handleRemove = async (item) => {
    try {
      await deleteDoc(doc(db, 'users', uid, 'cart', item.id));
    } catch (e) {
      setErrorMessage('Remove failed, '+ e.message);
    }
  };

  const changeQuantity = async (item, newQty) => {
    if (newQty < 1) return;
    try {
      await updateDoc(doc(db, 'users', uid, 'cart', item.id), {
        quantity: newQty,
      });
    } catch (e) {
      setErrorMessage('Update failed, '+ e.message);
    }
  };

  const subtotal = computeSubtotal(cartItems);
  const discountAmount = appliedPromo
    ? appliedPromo.type === 'percent'
      ? (subtotal * appliedPromo.amount) / 100
      : appliedPromo.type === 'fixed'
      ? appliedPromo.amount
      : 0
    : 0;
  const afterDiscount = Math.max(0, subtotal - discountAmount);
  const finalTotal = afterDiscount + DELIVERY_FEE;

  const handleCheckout = async () => {
    if (!uid) return;
    if (cartItems.length === 0) {
      setErrorMessage('Cart empty '+ 'Add items before checking out.');
      return;
    }
    setPlacingOrder(true);
    try {
      // Example: create orders and clear cart (you can adapt the earlier logic here)
      const batch = writeBatch(db);
      const ordersCollection = collection(db, 'orders');
      for (const ci of cartItems) {
        const newOrderRef = doc(ordersCollection);
        batch.set(newOrderRef, {
          buyerId: uid,
          sellerId: ci.sellerId,
          productId: ci.productId,
          price: ci.price,
          title: ci.title,
          imageUrl: ci.imageUrl,
          createdAt: serverTimestamp(),
          status: 'pending',
          quantity: ci.quantity,
        });
        const cartRef = doc(db, 'users', uid, 'cart', ci.id);
        batch.delete(cartRef);
      }
      await batch.commit();
      setErrorMessage('Success, '+ 'Order placed.'); 
    } catch (e) {
      setErrorMessage('Checkout failed, '+ e.message);
    } finally {
      setPlacingOrder(false);
    }
  };
  const fetchUserAddress = async () => {
  try {
    const userRef = doc(db, 'users', uid);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const data = snap.data();
      setUserAddress(data.address || 'No address found.');
    } else {
      setUserAddress('No address found.');
    }
  } catch (e) {
    setErrorMessage('Error, '+ 'Could not load address.');
  }
};


  if (!uid) {
    return (
      <View style={styles.center}>
        <Text>Please log in to view your cart.</Text>
      </View>
    );
  }

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text>Loading cart...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.wrapper}
      behavior={Platform.select({ ios: 'padding', android: undefined })}
    >
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          
        </TouchableOpacity>
        <Text style={styles.header}>My Cart</Text>
        <TouchableOpacity onPress={onRefresh} disabled={refreshing}>
          <Text style={styles.reload}>{refreshing ? 'Refreshing...' : ''}</Text>
        </TouchableOpacity>
      </View>

      {cartItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Your cart is empty.</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Home')} style={styles.browseBtn}>
            <Text style={styles.browseText}>Browse Products</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={cartItems}
          keyExtractor={(i) => i.id}
          
          renderItem={({ item }) => (
            <CartItem
              item={item}
              onRemove={handleRemove}
              onChangeQty={changeQuantity}
            />
          )}
          contentContainerStyle={{ paddingBottom: 280 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Promo + summary + checkout */}
      <View style={styles.checkoutContainer}>
        {errorMessage ? (
        <Text style={styles.errorText}>{errorMessage}</Text>
      ) : null}

        <View style={styles.promoRow}>
          <View style={styles.promoInputWrapper}>
            <TextInput
              placeholder="Promo code"
              value={promoInput}
              onChangeText={setPromoInput}
              style={styles.promoInput}
              editable={!appliedPromo}
              autoCapitalize="characters"
            />
            {appliedPromo ? (
              <View style={styles.appliedBadge}>
                <Text style={styles.appliedText}>Promocode applied ✓</Text>
                <TouchableOpacity onPress={clearPromo}>
                  <AntDesign name="close" size={14} style={{ marginLeft: 6 }} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity onPress={applyPromoCode} style={styles.applyBtn}>
                <Text style={styles.applyText}>Apply</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.summaryBox}>
          <View style={styles.summaryRow}>
            <Text style={styles.label}>Subtotal</Text>
            <Text style={styles.value}>{formatMoney(subtotal)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.label}>Delivery Fee</Text>
            <Text style={styles.value}>{formatMoney(DELIVERY_FEE)}</Text>
          </View>
          {appliedPromo && (
            <View style={styles.summaryRow}>
              <Text style={styles.label}>
                Discount ({appliedPromo.code})
              </Text>
              <Text style={[styles.value, { color: '#007a00' }]}>
                -{formatMoney(discountAmount)}
              </Text>
            </View>
          )}
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Checkout for</Text>
            <Text style={styles.totalValue}>{formatMoney(finalTotal)}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.checkoutBtn}
          onPress={async () => {
            await fetchUserAddress();
            setConfirmingCheckout(true);
          }}

          disabled={placingOrder || cartItems.length === 0}
        >
          <Text style={styles.checkoutBtnText}>
            {placingOrder
              ? 'Processing...'
              : `Checkout for ${formatMoney(finalTotal)}`}
          </Text>
        </TouchableOpacity>
      </View>
      <Modal visible={confirmingCheckout} transparent animationType="slide">
  <View style={{
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  }}>
    <View style={{
      backgroundColor: '#fff',
      width: '85%',
      padding: 20,
      borderRadius: 16,
    }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
        <Text style={{ fontSize: 18, fontWeight: '700' }}>Confirm Address</Text>
        <TouchableOpacity onPress={() => setConfirmingCheckout(false)}>
          <AntDesign name="close" size={20} />
        </TouchableOpacity>
      </View>

      <Text style={{ fontSize: 14, marginBottom: 8 }}>Shipping to:</Text>
      <Text style={{ fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 16 }}>
        {userAddress || 'No address found.'}
      </Text>

      <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
        <TouchableOpacity
          onPress={() => setConfirmingCheckout(false)}
          style={{
            paddingHorizontal: 16,
            paddingVertical: 10,
            backgroundColor: '#ccc',
            borderRadius: 8,
            marginRight: 10,
          }}
        >
          <Text style={{ fontWeight: '600' }}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={async () => {
            setConfirmingCheckout(false);
            await handleCheckout();
          }}
          style={{
            paddingHorizontal: 16,
            paddingVertical: 10,
            backgroundColor: '#00b05b',
            borderRadius: 8,
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '700' }}>Confirm</Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
</Modal>

    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerRow: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  errorText: {
  color: 'grey',
  textAlign: 'center',
  marginBottom: 16,
},

  header: { fontSize: 20, fontWeight: '700', marginTop:20 },
  reload: { color: '#007aff', fontWeight: '600' },
  cartCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    alignItems: 'center',
    gap: 12,
  },
  imageWrapper: {
    width: 64,
    height: 64,
    borderRadius: 10,
    overflow: 'hidden',
    marginRight: 8,
    backgroundColor: '#f0f0f0',
  },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600' },
  variant: { fontSize: 12, color: '#555', marginTop: 2 },
  price: { fontSize: 16, fontWeight: '600', marginTop: 4 },
  qtyRow: {
    flexDirection: 'row',
    marginTop: 6,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  qtyControls: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#d1d1d6',
    borderRadius: 6,
    alignItems: 'center',
    overflow: 'hidden',
  },
  qtyBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  qtyText: {
    minWidth: 24,
    textAlign: 'center',
    fontWeight: '600',
  },
  subtotal: { fontSize: 14, fontWeight: '500' },
  removeBtn: {
    padding: 6,
    marginLeft: 4,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    marginTop: 80,
  },
  emptyText: { fontSize: 16, marginBottom: 12 },
  browseBtn: {
    backgroundColor: '#00b05b',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  browseText: { color: '#fff', fontWeight: '600' },
  checkoutContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderColor: '#ececec',
  },
  promoRow: { marginBottom: 8 },
  promoInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  promoInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d1d6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  applyBtn: {
    backgroundColor: '#00b05b',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  applyText: { color: '#fff', fontWeight: '600' },
  appliedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e6f7ec',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  appliedText: {
    color: '#007a00',
    fontWeight: '600',
    fontSize: 12,
  },
  summaryBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  label: { fontSize: 14, color: '#555' },
  value: { fontSize: 14, fontWeight: '600' },
  totalRow: { marginTop: 6, borderTopWidth: 1, borderColor: '#eee', paddingTop: 8 },
  totalLabel: { fontSize: 18, fontWeight: '700' },
  totalValue: { fontSize: 18, fontWeight: '700' },
  checkoutBtn: {
    backgroundColor: '#00b05b',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  checkoutBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});
