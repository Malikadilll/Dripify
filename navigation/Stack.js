
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreen from '../screens/Login';
import SignupScreen from '../screens/Signup';
import BuyerHomeScreen from '../screens/BuyerHome';
import SellerHomeScreen from '../screens/SellerHome';
import AddProductScreen from '../screens/AddProductSeller';
import MyProductsScreen from '../screens/MyProductSeller';
import ProductDetailsScreen from '../screens/ProductDetailsBuyer';
import BuyerProductsScreen from '../screens/BuyBuyer';
import CommentsScreen from '../screens/CommentSection';
import BuyerProfileScreen from '../screens/ProfileBuyer';
import SellerProfileScreen from '../screens/ProfileSeller';
import BuyerOrderHistoryScreen from '../screens/OrderHistoryBuyer';
import SellerOrdersScreen from '../screens/OrdersSeller';
import CartScreen from '../screens/CartBuyer';
import SellerProductDetailsScreen from '../screens/ProductDetailsSeller';
import CategoryProductsScreen from '../screens/CategoryProductsBuyer';
import ChatScreen from '../screens/ChatScreen';
import ChatListScreen from '../screens/ConvoScreen';
import SplashScreen from '../screens/SplashScreen';

import BuyerTab from './BuyerTab';
import SellerTab from './SellerTab';

const Stack = createNativeStackNavigator();

const StackNavigator = () => {
  return (
    <Stack.Navigator initialRouteName="Splash" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} options={{headerShown:false}} />
        <Stack.Screen name="Splash" component={SplashScreen} options={{headerShown:false}} />
        <Stack.Screen name="Signup" component={SignupScreen} options={{headerShown:false}} />
        <Stack.Screen name="SellerHome" component={SellerHomeScreen} options={{headerShown:false}} />
        <Stack.Screen name="BuyerHome" component={BuyerHomeScreen} options={{headerShown:false}} />
        <Stack.Screen name="SellerTab" component={SellerTab} options={{headerShown:false}} />
        <Stack.Screen name="BuyerTab" component={BuyerTab} options={{headerShown:false}} />
        <Stack.Screen name="AddProduct" component={AddProductScreen} options={{headerShown:false}} />
        <Stack.Screen name="MyProducts" component={MyProductsScreen} options={{headerShown:false}} />
        <Stack.Screen name="ProductDetails" component={ProductDetailsScreen} options={{headerShown:false}} />
        <Stack.Screen name="BuyerProducts" component={BuyerProductsScreen} options={{headerShown:false}} />
        <Stack.Screen name="Comments" component={CommentsScreen} options={{headerShown:false}} />
        <Stack.Screen name="BuyerProfile" component={BuyerProfileScreen} options={{headerShown:false}} />
        <Stack.Screen name="BuyerOrderHistory" component={BuyerOrderHistoryScreen} options={{headerShown:false}} />
        <Stack.Screen name="SellerOrders" component={SellerOrdersScreen} options={{headerShown:false}} />
        <Stack.Screen name="Cart" component={CartScreen} options={{headerShown:false}} />
        <Stack.Screen name="SellerProductDetails" component={SellerProductDetailsScreen} options={{headerShown:false}} />
        <Stack.Screen name="SellerProfile" component={SellerProfileScreen} options={{headerShown:false}} />
        <Stack.Screen name="CategoryProducts" component={CategoryProductsScreen} options={{headerShown:false}} />
        <Stack.Screen name="ChatScreen" component={ChatScreen} options={{headerShown:false}} />
        
        <Stack.Screen name="ChatList" component={ChatListScreen} options={{headerShown:false}} />

        


    </Stack.Navigator>
  );
};

export default StackNavigator;
