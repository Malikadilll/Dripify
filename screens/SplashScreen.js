
import React, { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import LottieView from 'lottie-react-native';

const SplashScreen = ({ navigation }) => {
  const animationRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.replace('Login');
    }, 2500); // Adjust duration as needed

    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <View style={styles.container}>
      <LottieView
        ref={animationRef}
        source={require('../assets/splash.json')}
        autoPlay
        loop={false}
        style={styles.lottie}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lottie: {
    width: 300,
    height: 300,
  },
});

export default SplashScreen;
