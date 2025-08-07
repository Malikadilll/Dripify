import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { TouchableOpacity, StyleSheet, View } from 'react-native';

import BuyerHomeScreen from '../screens/BuyerHome';
import BuyerProductsScreen from '../screens/BuyBuyer';
import BuyerProfileScreen from '../screens/ProfileBuyer';
import BuyerOrderHistoryScreen from '../screens/OrderHistoryBuyer';
import CartScreen from '../screens/CartBuyer';

const Tab = createBottomTabNavigator();

const CustomSellButton = ({ children, onPress }) => (
  <TouchableOpacity
    style={styles.sellButtonContainer}
    onPress={onPress}
    activeOpacity={0.5}
  >
    <View style={styles.sellButton}>{children}</View>
  </TouchableOpacity>
);


const BuyerTab = () => {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          } else if (route.name === 'Cart') {
            iconName = focused ? 'cart' : 'cart-outline';
          } else if (route.name === 'Buy') {
            iconName = focused ? 'search' : 'search-outline';
          } else if (route.name === 'Orders') {
            iconName = focused ? 'time' : 'time-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#00b05b',
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: {
          backgroundColor: '#fff',
          paddingBottom: 5,
          height: 60,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={BuyerHomeScreen} />
      <Tab.Screen name="Cart" component={CartScreen} />
      <Tab.Screen name="Buy" component={BuyerProductsScreen} />
      <Tab.Screen name="Orders" component={BuyerOrderHistoryScreen} />
      <Tab.Screen name="Profile" component={BuyerProfileScreen} />
    </Tab.Navigator>
  );
};

export default BuyerTab;

const styles = StyleSheet.create({
  sellButtonContainer: {
    top: -20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sellButton: {
    width: 65,
    height: 65,
    borderRadius: 35,
    backgroundColor: '#053BA8',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
});
