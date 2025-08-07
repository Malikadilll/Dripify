import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  TouchableOpacity,
  KeyboardAvoidingView,
  ScrollView,
  Platform
} from 'react-native';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';

export default function SignupScreen({ navigation }) {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState('male');
  const [role, setRole] = useState('buyer');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [address, setAddress] = useState('');
  const [errorMessage, setErrorMessage] = useState('');


  const handleSignup = async () => {
    if (!fullName || !phone || !email || !password || !address) {
      setErrorMessage('Error, '+ 'Please fill out all fields.');
      return;
    }

    try {
      const userCred = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );
      const uid = userCred.user.uid;

      await setDoc(doc(db, 'users', uid), {
        name: fullName.trim(),
        phone,
        gender,
        role,
        email: email.trim(),
        address,
      });

      setErrorMessage('Success, '+ 'Account created!');
      navigation.replace('Login');
    } catch (err) {
      setErrorMessage('Signup Failed, '+ err.message);
    }
  };

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMessage('Permission denied', 'Location access is required to fetch your address.');
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = loc.coords;
      const geocode = await Location.reverseGeocodeAsync({ latitude, longitude });

      if (geocode.length > 0) {
        const g = geocode[0];
        const formatted = `${g.name || ''}, ${g.street || ''}, ${g.city || ''}, ${g.region || ''}, ${g.postalCode || ''}`;
        setAddress(formatted);
      }
    } catch (err) {
      setErrorMessage('Location Error, '+ err.message);
    }
  };

 return (
  <KeyboardAvoidingView
    style={{ flex: 1 }}
    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
  >
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >

      <Text style={styles.logo}>Dripify</Text>
      <Text style={styles.welcome}>Create your drops account</Text>

      <View style={styles.inputContainer}>
        <TextInput
          placeholder="Full Name"
          placeholderTextColor="#aaa"
          value={fullName}
          onChangeText={setFullName}
          style={styles.input}
        />
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          placeholder="Phone Number"
          placeholderTextColor="#aaa"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          style={styles.input}
        />
      </View>

      <Text style={styles.label}>Gender</Text>
      <View style={styles.optionRow}>
        {['male', 'female', 'other'].map((g) => (
          <TouchableOpacity
            key={g}
            style={[
              styles.optionButton,
              gender === g && styles.optionButtonActive,
            ]}
            onPress={() => setGender(g)}
          >
            <Text
              style={[
                styles.optionText,
                gender === g && styles.optionTextActive,
              ]}
            >
              {g.charAt(0).toUpperCase() + g.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Role</Text>
      <View style={styles.optionRow}>
        {['buyer', 'seller'].map((r) => (
          <TouchableOpacity
            key={r}
            style={[
              styles.optionButton,
              role === r && styles.optionButtonActive,
            ]}
            onPress={() => setRole(r)}
          >
            <Text
              style={[
                styles.optionText,
                role === r && styles.optionTextActive,
              ]}
            >
              {r.charAt(0).toUpperCase() + r.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          placeholder="Email"
          placeholderTextColor="#aaa"
          value={email}
          onChangeText={setEmail}
          style={styles.input}
          autoCapitalize="none"
          keyboardType="email-address"
        />
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          placeholder="Password"
          placeholderTextColor="#aaa"
          value={password}
          onChangeText={setPassword}
          style={styles.input}
          secureTextEntry
        />
      </View>

      <View style={[styles.inputContainer, { flexDirection: 'row', alignItems: 'center' }]}>
  <TextInput
    placeholder="Address"
    placeholderTextColor="#aaa"
    value={address}
    onChangeText={setAddress}
    style={[styles.input, { flex: 1, marginRight: 10 }]}
  />

  <TouchableOpacity
    onPress={getCurrentLocation}
    style={{
      padding: 8,
      backgroundColor: '#00aa55',
      borderRadius: 8,
    }}
  >
    <Ionicons name="location-sharp" size={20} color="white" />
  </TouchableOpacity>
</View>

            {errorMessage ? (
        <Text style={styles.errorText}>{errorMessage}</Text>
      ) : null}

      <TouchableOpacity style={styles.signUpButton} onPress={handleSignup}>
        <Text style={styles.signUpText}>Sign Up</Text>
      </TouchableOpacity>

      <View style={styles.dividerContainer}>
        <View style={styles.dividerLine} />
        <Text style={styles.orText}>or</Text>
        <View style={styles.dividerLine} />
      </View>

      <TouchableOpacity style={styles.loginRedirect} onPress={() => navigation.navigate('Login')}>
        <Text style={styles.loginRedirectText}>Already have an account? Login</Text>
      </TouchableOpacity>
        </ScrollView>
  </KeyboardAvoidingView>
);

}

const styles = StyleSheet.create({
  
  container: {
    flexGrow: 1, alignItems: 'center',
    backgroundColor: '#f6fdf7', padding: 24
  },
  logo: {
    fontSize: 32, fontWeight: 'bold', color: '#00aa55', marginBottom: 4, marginTop: 20
  },
  welcome: {
    fontSize: 16, color: '#555', marginBottom: 32
  },
  errorText: {
  color: 'red',
  textAlign: 'center',
  marginBottom: 16,
},

  inputContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 16,
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 12
  },
  input: {
    flex: 1,
    height: 50,
    color: 'black',
  },
  label: {
    alignSelf: 'flex-start',
    marginBottom: 6,
    marginTop: 6,
    fontWeight: 'bold',
    color: '#444',
  },
  optionRow: {
    flexDirection: 'row',
    width: '100%',
    marginBottom: 12,
    justifyContent: 'space-between'
  },
  optionButton: {
    flex: 1,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#fff'
  },
  optionButtonActive: {
    backgroundColor: '#00aa55',
    borderColor: '#00aa55',
  },
  optionText: {
    color: '#333',
  },
  optionTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  signUpButton: {
    backgroundColor: '#00aa55',
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8
  },
  signUpText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#ccc'
  },
  orText: {
    marginHorizontal: 8,
    color: '#555'
  },
  loginRedirect: {
    borderWidth: 1,
    borderColor: '#00aa55',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginRedirectText: {
    color: '#00aa55',
    fontWeight: 'bold',
  }
});
