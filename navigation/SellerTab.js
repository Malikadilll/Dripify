import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { TouchableOpacity, StyleSheet, View } from 'react-native';

import SellerHomeScreen from '../screens/SellerHome';
import AddProductScreen from '../screens/AddProductSeller';
import MyProductsScreen from '../screens/MyProductSeller';
import SellerOrdersScreen from '../screens/OrdersSeller';
import SellerProfileScreen from '../screens/ProfileSeller';

const Tab = createBottomTabNavigator();




const SellerTab = () => {
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
          } else if (route.name === 'MyProducts') {
            iconName = focused ? 'pricetag' : 'pricetag-outline';
          } else if (route.name === 'Sell') {
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
      <Tab.Screen name="Home" component={SellerHomeScreen} />
      <Tab.Screen name="MyProducts" component={MyProductsScreen} />
      <Tab.Screen name="Sell" component={AddProductScreen} />
      <Tab.Screen name="Orders" component={SellerOrdersScreen} />
      <Tab.Screen name="Profile" component={SellerProfileScreen} />
    </Tab.Navigator>
  );
};

export default SellerTab;

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
