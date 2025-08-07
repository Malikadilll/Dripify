import React from 'react';
import { View, Image, StyleSheet, Dimensions } from 'react-native';
import Carousel from 'react-native-reanimated-carousel';

const logos = [
  require("../assets/logos2/diners.png"),
  require("../assets/logos2/sapphire.png"),
  require("../assets/logos2/nishat.png"),
  require("../assets/logos2/chanel.png"),
  require("../assets/logos2/nike.jpg"),
  require("../assets/logos2/adidas.png"),
  require("../assets/logos2/engine.png"),
  require("../assets/logos2/polo.png"),
  require("../assets/logos2/khaadi.png"),
];

const { width: screenWidth } = Dimensions.get('window');

export default function BrandIcons() {
  const itemWidth = 80;

  return (
    <View style={styles.container}>
      <Carousel
        loop
        width={screenWidth*8}
        height={100} // height of the whole carousel container
        autoPlay
        data={logos}
        scrollAnimationDuration={600}
        autoPlayInterval={800}
        pagingEnabled={false}
        mode="horizontal-stack"
        modeConfig={{
          showLength: Math.floor(screenWidth / itemWidth),
          snapDirection: 'left',
          stackInterval: 10,
        }}
        renderItem={({ item }) => (
          <View style={[styles.highlight, { width: itemWidth }]}>
            <Image style={styles.highlightdp} source={item} />
          </View>
        )}
        panGestureHandlerProps={{
          activeOffsetX: [-10, 10],
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
    width: '100%',
  },
  highlight: {
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  highlightdp: {
    height: 60,
    width: 60,
    borderRadius: 100,
  },
});
