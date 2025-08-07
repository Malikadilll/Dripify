import React, { useEffect, useState, useLayoutEffect } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator, Alert, Button,
  ScrollView, TouchableOpacity, Dimensions, Modal, TextInput,
} from 'react-native';
import { auth, db } from '../firebase';
import { doc, getDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { BarChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';

const screenWidth = Dimensions.get('window').width;

export default function SellerProfileScreen({ navigation }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', gender: '' });

  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigation.replace('Login');
    } catch (error) {
      Alert.alert('Logout Failed', error.message || 'Please try again.');
    }
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => <Button title="Logout" onPress={handleLogout} />,
    });
  }, [navigation]);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      setLoading(false);
      Alert.alert('Error', 'No authenticated user.');
      return;
    }

    const fetchData = async () => {
      try {
        const userSnap = await getDoc(doc(db, 'users', uid));
        if (userSnap.exists()) {
          setProfile(userSnap.data());
        }

        const orderQuery = query(collection(db, 'orders'), where('sellerId', '==', uid));
        const orderSnap = await getDocs(orderQuery);
        const orderList = orderSnap.docs.map(doc => doc.data());
        setOrders(orderList);

      } catch (err) {
        Alert.alert('Error', 'Failed to load profile or orders.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const openEditModal = () => {
    setForm({
      name: profile?.name || '',
      phone: profile?.phone || '',
      gender: profile?.gender || '',
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    try {
      await updateDoc(doc(db, 'users', uid), {
        name: form.name,
        phone: form.phone,
        gender: form.gender,
      });
      setProfile({ ...profile, ...form });
      setModalVisible(false);
    } catch (error) {
      Alert.alert('Update Failed', error.message);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#00aa55" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Profile data unavailable.</Text>
        <Button title="Logout" onPress={handleLogout} />
      </View>
    );
  }

  const ordersReceived = orders.length;
  const ordersCompleted = orders.filter(o => o.status === 'completed').length;
  const ordersCancelled = orders.filter(o => o.status === 'cancelled').length;

  const chartData = {
    labels: ['Received', 'Completed', 'Cancelled'],
    datasets: [
      {
        data: [ordersReceived, ordersCompleted, ordersCancelled],
      },
    ],
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Seller Profile</Text>

      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {profile?.name?.charAt(0)?.toUpperCase() || '?'}
        </Text>
      </View>

      <View style={styles.infoCard}>
        <TouchableOpacity style={{ alignItems: 'flex-end' }} onPress={openEditModal}>
          <Ionicons name="create" size={30} color={"#00b05b"} />
        </TouchableOpacity>
        <Text style={styles.item}>Name: {profile.name}</Text>
        <Text style={styles.item}>Email: {auth.currentUser?.email}</Text>
        <Text style={styles.item}>Phone: {profile.phone}</Text>
        <Text style={styles.item}>Gender: {profile.gender}</Text>
        <Text style={styles.item}>Role: {profile.role}</Text>
      </View>

      <Text style={styles.statsHeader}>Order Stats</Text>

      <View style={styles.statsCard}>
        <Text style={styles.stat}>Orders Received: {ordersReceived}</Text>
        <Text style={styles.stat}>Completed: {ordersCompleted}</Text>
        <Text style={styles.stat}>Cancelled: {ordersCancelled}</Text>
      </View>

      <Text style={styles.chartTitle}>Order Overview</Text>

      <BarChart
        data={chartData}
        width={screenWidth - 48}
        height={220}
        yAxisLabel=""
        chartConfig={{
          backgroundGradientFrom: '#f6fdf7',
          backgroundGradientTo: '#f6fdf7',
          decimalPlaces: 0,
          color: (opacity = 1) => `rgba(0, 170, 85, ${opacity})`,
          labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
          style: { borderRadius: 12 },
        }}
        style={{ marginVertical: 8, borderRadius: 12 }}
      />

      <TouchableOpacity style={styles.checkoutBtn} onPress={handleLogout}>
        <Text style={styles.checkoutBtnText}>Logout</Text>
      </TouchableOpacity>

      {/* Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Edit Profile</Text>

            <TextInput
              style={styles.input}
              placeholder="Name"
              value={form.name}
              onChangeText={(text) => setForm({ ...form, name: text })}
            />
            <TextInput
              style={styles.input}
              placeholder="Phone"
              keyboardType="phone-pad"
              value={form.phone}
              onChangeText={(text) => setForm({ ...form, phone: text })}
            />
            <TextInput
              style={styles.input}
              placeholder="Gender"
              value={form.gender}
              onChangeText={(text) => setForm({ ...form, gender: text })}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.saveBtnText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, backgroundColor: 'white' },
  heading: { fontSize: 26, fontWeight: '700', marginBottom: 20, textAlign: 'center', color: '#333', marginTop: 20 },
  infoCard: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 10,
    elevation: 3,
    marginBottom: 16,
  },
  item: { fontSize: 16, marginBottom: 8, color: '#555' },
  statsHeader: {
    fontSize: 20, fontWeight: '600', marginTop: 30, marginBottom: 8, color: '#00aa55'
  },
  statsCard: {
    backgroundColor: '#e9f7ef',
    padding: 16,
    borderRadius: 10,
    marginBottom: 16,
  },
  stat: {
    fontSize: 16,
    marginBottom: 6,
    color: '#333',
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#444',
    marginBottom: 8,
    marginTop: 8,
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingText: { marginTop: 8, fontSize: 16, color: '#555' },
  errorText: { marginBottom: 12, fontSize: 16, color: '#00b05b' },
  checkoutBtn: {
    backgroundColor: '#00b05b',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 50
  },
  checkoutBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#00b05b',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 40,
    color: 'white',
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  saveBtn: {
    flex: 1,
    backgroundColor: '#00b05b',
    padding: 14,
    borderRadius: 10,
    marginRight: 8,
    alignItems: 'center',
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#ccc',
    padding: 14,
    borderRadius: 10,
    marginLeft: 8,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  cancelBtnText: {
    color: '#333',
    fontWeight: '600',
    fontSize: 16,
  },
});
