import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const FlashSaleBanner = ({ duration = 3600 }) => {
  const [timeLeft, setTimeLeft] = useState(duration);
  const [visible, setVisible] = useState(true);

  // Flashing text effect
  useEffect(() => {
    const flashInterval = setInterval(() => {
      setVisible(prev => !prev);
    }, 600);

    return () => clearInterval(flashInterval);
  }, []);

  // Countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  return (
    <LinearGradient
      colors={['#41ffb6ff', '#629765ff']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.bannerContainer}
    >
      <View style={styles.row}>
        <Text style={styles.emoji}>🔥</Text>
        {visible && <Text style={styles.flashText}>FLASH SALE <Text style={{fontSize:10}}>20% off</Text></Text>}
        <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  bannerContainer: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    margin: 16,
    elevation: 5,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  emoji: {
    fontSize: 24,
  },
  flashText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  timerText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
});

export default FlashSaleBanner;
