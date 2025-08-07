import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Image } from 'react-native';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { Ionicons } from '@expo/vector-icons'; // for eye icon, optional

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secure, setSecure] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');


  const handleLogin = async () => {
    try {
      const userCred = await signInWithEmailAndPassword(auth, email.trim(), password);
      const uid = userCred.user.uid;

      const userDocRef = doc(db, 'users', uid);
      const userSnapshot = await getDoc(userDocRef);

      if (!userSnapshot.exists()) {
        setErrorMessage('Error, '+ 'User profile not found in Firestore.');
        return;
      }

      const userData = userSnapshot.data();
      const { role } = userData;

      if (role === 'buyer') {
        navigation.replace('BuyerTab');
      } else if (role === 'seller') {
        navigation.replace('SellerTab');
      } else {
        setErrorMessage('Error, '+ 'Invalid role. Contact support.');
      }

    } catch (error) {
      setErrorMessage('Login failed'+ error.message);
    }
  };

  return (
    
    <View style={styles.container}>
      
      <Image style={styles.dp} source={require("../assets/logo.png")} />
      <Text style={styles.welcome}>Welcome to your drops</Text>
      <View style={styles.inputContainer}>
        <TextInput
          placeholder="Email"
          placeholderTextColor="#aaa"
          value={email}
          onChangeText={setEmail}
          style={styles.input}
        />
      </View>
      <View style={styles.inputContainer}>
        <TextInput
          placeholder="Password"
          placeholderTextColor="#aaa"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={secure}
          style={styles.input}
        />
        <TouchableOpacity
          style={styles.eye}
          onPress={() => setSecure(!secure)}
        >
          <Ionicons name={secure ? "eye-off" : "eye"} size={20} color="#666" />
        </TouchableOpacity>
      </View>
            {errorMessage ? (
        <Text style={styles.errorText}>{errorMessage}</Text>
      ) : null}

      <TouchableOpacity style={styles.signInButton} onPress={handleLogin}>
        <Text style={styles.signInText}>Sign In</Text>
      </TouchableOpacity>

      <TouchableOpacity >
        {/* onPress={() => navigation.navigate('ForgotPassword')} */}
      </TouchableOpacity>

      <View style={styles.dividerContainer}>
        <View style={styles.dividerLine} />
        <Text style={styles.orText}>or</Text>
        <View style={styles.dividerLine} />
      </View>

      <TouchableOpacity style={styles.googleButton} onPress={() => navigation.navigate('Signup')  }>
        
        <Text style={styles.googleText}>Don't have an account? Signup</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#f6fdf7', padding: 24
  },
  errorText:{
    color: 'red',
    textAlign: 'center',
    marginBottom: 16,
  },
  logo: {
    fontSize: 32, fontWeight: 'bold', color: '#00aa55', marginBottom: 4
  },
  welcome: {
    fontSize: 16, color: '#555', marginBottom: 32
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
  eye: {
    padding: 8
  },
  signInButton: {
    backgroundColor: '#00aa55',
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8
  },
  signInText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16
  },
  forgot: {
    color: '#00aa55',
    marginTop: 16,
    fontSize: 14
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
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#00aa55',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    width: '100%',
    justifyContent: 'center'
  },
  googleText: {
    color: '#00aa55',
    fontWeight: 'bold'
  },
  dp:{
    width: 150,
    height: 150,
    borderRadius: 50,
    backgroundColor: '#00b05b',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
});
