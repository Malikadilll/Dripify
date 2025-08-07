
import React, { useState, useEffect } from 'react';
import 'react-native-get-random-values';
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  Alert,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Picker } from '@react-native-picker/picker';
import { v4 as uuidv4 } from 'uuid';
import { auth, db } from '../firebase';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

// Cloudinary config — replace with your real values
const CLOUD_NAME = 'douaxb1k6';
const UPLOAD_PRESET = 'Dripify';

// Mapping of main categories to subcategories
const SUBCATEGORIES = {
  upper: ['Polo', 'T-Shirt', 'Dress Shirt'],
  bottom: ['Jeans', 'Dress Pants', 'Shorts', 'Trousers'],
  suits: ['Mens', 'Womans'],
  shoes: ['Slippers', 'Casual Shoes', 'Dress Shoes', 'Joggers'],
  accessories: ['Hats', 'Rings', 'Watches'],
};

export default function AddProductScreen({ navigation }) {
  const [imageUri, setImageUri] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('upper');
  const [subCategory, setSubCategory] = useState(SUBCATEGORIES['upper'][0]);
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('1');
  const [uploading, setUploading] = useState(false);
  const [sellerInfo, setSellerInfo] = useState({ name: '', uid: '' });
  const [errorMessage, setErrorMessage] = useState('');


  useEffect(() => {
    setSubCategory(SUBCATEGORIES[category][0]);
  }, [category]);

  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      const uid = user.uid;
      (async () => {
        try {
          const userDocRef = doc(db, 'users', uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            const data = userDoc.data();
            setSellerInfo({ name: data.name || '', uid });
          } else {
            setSellerInfo({ name: '', uid });
          }
        } catch (e) {
          console.warn('Failed to fetch seller profile', e);
        }
      })();
    }
  }, []);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      setErrorMessage('Permission required, '+ 'Need gallery access to pick an image.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
    });
    if (!result.cancelled) {
      setImageUri(result.assets ? result.assets[0].uri : result.uri);
    }
  };

  const uploadToCloudinary = async (uri) => {
    try {
      if (!uri) throw new Error('No image URI provided');

      const formData = new FormData();
      formData.append('upload_preset', UPLOAD_PRESET);
      formData.append('file', {
        uri,
        type: 'image/jpeg',
        name: `upload_${Date.now()}.jpg`,
      });

      const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

      const res = await fetch(url, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Cloudinary upload failed: ${res.status} ${text}`);
      }

      const data = await res.json();
      return data.secure_url;
    } catch (err) {
      console.error('uploadToCloudinary error:', err);
      throw err;
    }
  };

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim() || !price.trim() || !imageUri || !stock.trim()) {
      setErrorMessage('Validation, '+ 'All fields including image and stock are required.');
      return;
    }
    if (isNaN(Number(price)) || Number(price) <= 0) {
      setErrorMessage('Validation  '+ 'Price must be a positive number.');
      return;
    }
    const stockNum = parseInt(stock, 10);
    if (isNaN(stockNum) || stockNum < 0) {
      setErrorMessage('Validation, '+ 'Stock must be zero or greater (integer).');
      return;
    }
    if (!sellerInfo.uid) {
      setErrorMessage('Error, '+ 'Seller info not loaded.');
      return;
    }

    setUploading(true);
    try {
      const imageUrl = await uploadToCloudinary(imageUri);

      const productId = uuidv4();
      const productRef = doc(db, 'products', productId);
      await setDoc(productRef, {
        title: title.trim(),
        description: description.trim(),
        price: Number(price),
        currency: 'USD',
        category,
        subCategory,
        imageUrl,
        sellerId: sellerInfo.uid,
        sellerName: sellerInfo.name,
        stock: stockNum,
        isActive: stockNum > 0,
        ratingAvg: 0,
        ratingCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      Alert.alert('Success', 'Product listed for sale.');
      navigation.goBack();
    } catch (e) {
      console.error(e);
      Alert.alert('Failed', e.message || 'Could not upload product.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <KeyboardAvoidingView
    style={styles.body}
    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
  >
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.heading}>Add Item for Sale</Text>

      <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.imagePreview} />
        ) : (
          <Text style={styles.pickText}>Pick Image</Text>
        )}
      </TouchableOpacity>
            {errorMessage ? (
      <Text style={styles.errorText}>{errorMessage}</Text>
    ) : null}

      <TextInput placeholder="Title" value={title} onChangeText={setTitle} style={styles.input} />

      <TextInput
        placeholder="Description"
        value={description}
        onChangeText={setDescription}
        style={[styles.input, { height: 80 }]}
        multiline
      />

      <View style={styles.row}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text style={styles.label}>Category</Text>
          <View style={styles.pickerWrapper}>
            <Picker selectedValue={category} onValueChange={setCategory}>
              <Picker.Item label="Upper" value="upper" />
              <Picker.Item label="Bottom" value="bottom" />
              <Picker.Item label="Suits" value="suits" />
              <Picker.Item label="Shoes" value="shoes" />
              <Picker.Item label="Accessories" value="accessories" />
              
            </Picker>
          </View>
        </View>

        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={styles.label}>Subcategory</Text>
          <View style={styles.pickerWrapper}>
            <Picker selectedValue={subCategory} onValueChange={setSubCategory}>
              {SUBCATEGORIES[category].map((sc) => (
                <Picker.Item key={sc} label={sc} value={sc} />
              ))}
            </Picker>
          </View>
        </View>
      </View>

      <View style={{ marginBottom: 12 }}>
        <Text style={styles.label}>Price</Text>
        <TextInput
          placeholder="e.g., 49.99"
          value={price}
          onChangeText={setPrice}
          keyboardType="decimal-pad"
          style={styles.input}
        />
      </View>

      <View style={{ marginBottom: 16 }}>
        <Text style={styles.label}>Stock</Text>
        <TextInput
          placeholder="e.g., 5"
          value={stock}
          onChangeText={setStock}
          keyboardType="number-pad"
          style={styles.input}
        />
      </View>

      {uploading ? (
        <ActivityIndicator size="large" style={{ marginVertical: 16 }} />
      ) : (
        <Button title="List Product" onPress={handleSubmit} color="#00b05b" />
      )}
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  body:{flex:1, backgroundColor:"white"},
  container: { padding: 24, backgroundColor: '#fff' },
  heading: { fontSize: 24, fontWeight: '600', marginBottom: 16, textAlign: 'center', marginTop:10, },
  imagePicker: {
    height: 180,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    marginBottom: 16,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  pickText: { color: '#555' },
  imagePreview: { width: '100%', height: '100%', resizeMode: 'cover' },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  row: { flexDirection: 'row', marginBottom: 12 },
  label: { marginBottom: 4, fontWeight: '500' },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    overflow: 'hidden',
  },
  errorText: {
  color: 'red',
  textAlign: 'center',
  marginBottom: 16,
},

});
