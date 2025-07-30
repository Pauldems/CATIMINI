import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator, TransitionPresets } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { onAuthStateChanged, User } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from './src/config/firebase';
import { View, ActivityIndicator, Easing } from 'react-native';
import { LocaleConfig } from 'react-native-calendars';
import * as Notifications from 'expo-notifications';
import { NavigationContainerRef } from '@react-navigation/native';

// Configuration globale de la locale française
LocaleConfig.locales['fr'] = {
  monthNames: [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ],
  monthNamesShort: [
    'Janv.', 'Févr.', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juil.', 'Août', 'Sept.', 'Oct.', 'Nov.', 'Déc.'
  ],
  dayNames: ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'],
  dayNamesShort: ['Dim.', 'Lun.', 'Mar.', 'Mer.', 'Jeu.', 'Ven.', 'Sam.'],
  today: "Aujourd'hui"
};
LocaleConfig.defaultLocale = 'fr';

// Screens
import { LoginScreen, RegisterScreen } from './src/features/auth/screens';
import { 
  AvailabilityScreen, 
  CreateEventScreen, 
  EditEventScreen, 
  MyEventsScreen, 
  EventDetailsScreen, 
  GroupManagementScreen, 
  PrivacyPolicyScreen,
  TermsOfUseScreen 
} from './src/features/field/screens';
import { FriendsScreen, SettingsScreen } from './src/features/profile/screens';

// Services
import notificationService from './src/services/notificationService';
import premiumService from './src/services/premiumService';
import storeKitService from './src/services/storeKitService';
import cleanupService from './src/services/cleanupService';

// Components
import { CustomTabBar } from './src/components';

// Hooks
import { useCleanup } from './src/hooks/useCleanup';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function AuthStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
      <Stack.Screen name="TermsOfUse" component={TermsOfUseScreen} />
    </Stack.Navigator>
  );
}

// Animations personnalisées
const scaleFromCenterTransition = {
  cardStyleInterpolator: ({ current }: any) => {
    return {
      cardStyle: {
        transform: [
          {
            scale: current.progress.interpolate({
              inputRange: [0, 1],
              outputRange: [0.3, 1],
              extrapolate: 'clamp',
            }),
          },
        ],
        opacity: current.progress.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [0, 0.8, 1],
          extrapolate: 'clamp',
        }),
      },
    };
  },
};

function MainStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        ...TransitionPresets.SlideFromRightIOS,
      }}
    >
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen 
        name="EventDetails" 
        component={EventDetailsScreen}
        options={TransitionPresets.SlideFromRightIOS}
      />
      <Stack.Screen 
        name="EditEvent" 
        component={EditEventScreen}
        options={TransitionPresets.SlideFromRightIOS}
      />
      <Stack.Screen 
        name="GroupManagement" 
        component={GroupManagementScreen}
        options={TransitionPresets.SlideFromRightIOS}
      />
      <Stack.Screen 
        name="PrivacyPolicy" 
        component={PrivacyPolicyScreen}
        options={TransitionPresets.SlideFromRightIOS}
      />
      <Stack.Screen 
        name="TermsOfUse" 
        component={TermsOfUseScreen}
        options={TransitionPresets.SlideFromRightIOS}
      />
    </Stack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerStyle: {
          backgroundColor: '#FFFFFF',
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 0,
        },
        headerTitleStyle: {
          fontWeight: '300',
          fontSize: 24,
        },
      }}
    >
      <Tab.Screen
        name="Availability"
        component={AvailabilityScreen}
        options={{
          tabBarLabel: 'Agenda',
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="Friends"
        component={FriendsScreen}
        options={{
          tabBarLabel: 'Groupe',
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="CreateEvent"
        component={CreateEventScreen}
        options={{
          tabBarLabel: '',
          headerShown: false,
          ...scaleFromCenterTransition,
        }}
      />
      <Tab.Screen
        name="MyEvents"
        component={MyEventsScreen}
        options={{
          tabBarLabel: 'Événements',
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Réglages',
          headerShown: false,
        }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigationRef = React.useRef<NavigationContainerRef<any>>(null);
  
  // Déclencher le nettoyage automatique (désactivé temporairement)
  // useCleanup();

  useEffect(() => {
    // Timeout de sécurité pour éviter le blocage infini
    const timeoutId = setTimeout(() => {
      console.error('⏰ TIMEOUT: Forçage de fin de chargement après 10s');
      setLoading(false);
    }, 10000);

    // Vérifier s'il y a un utilisateur en cache
    const checkPersistedUser = async () => {
      try {
        const persistedUser = await AsyncStorage.getItem('user');
        if (persistedUser && !auth.currentUser) {
          // L'utilisateur était connecté mais la session Firebase a expiré
          await AsyncStorage.removeItem('user');
        }
      } catch (error) {
        console.error('Erreur lors de la vérification de la persistance:', error);
      }
    };

    checkPersistedUser();

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('🔑 [App] ===== AUTH STATE CHANGED =====');
      console.log('🔑 [App] User:', user ? `${user.email} (${user.uid})` : 'null');
      
      setUser(user);
      
      // Sauvegarder l'état de connexion
      if (user) {
        console.log('🔑 [App] Saving user to AsyncStorage');
        await AsyncStorage.setItem('user', JSON.stringify({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName
        }));
        
        // Initialiser les services une seule fois
        if (!user.uid || user.uid !== auth.currentUser?.uid) {
          console.log('🔑 [App] Skip init - user mismatch');
          return;
        }
        
        console.log('🔑 [App] Initialisation des services...');
        
        // Initialiser StoreKit avec gestion d'erreur
        const initStoreKit = async () => {
          try {
            console.log('🔑 [App] Début init StoreKit');
            await storeKitService.initialize();
            console.log('🔑 [App] StoreKit initialisé');
          } catch (error) {
            console.error('🔑 [App] Erreur StoreKit (non bloquante):', error);
          }
        };
        
        // Initialiser le service premium
        const initPremium = async () => {
          try {
            console.log('🔑 [App] Début init Premium');
            await premiumService.initialize();
            console.log('🔑 [App] Premium initialisé');
          } catch (error) {
            console.error('🔑 [App] Erreur Premium Service:', error);
          }
        };
        
        // Lancer les initialisations
        Promise.all([initStoreKit(), initPremium()]).then(() => {
          console.log('🔑 [App] Tous les services sont initialisés');
          
          // Démarrer le nettoyage automatique des indispos passées
          cleanupService.startAutoCleanup();
          console.log('🧹 [App] Service de nettoyage démarré');
        });
        
        // Initialiser les notifications de manière sécurisée
        const initializeNotifications = async () => {
          try {
            // Attendre que l'app soit prête
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Vérifier que l'utilisateur est toujours connecté
            if (!auth.currentUser) {
              console.log('🔑 [App] User disconnected, skipping notifications init');
              return;
            }
            
            await notificationService.initialize();
            
            // Configurer les listeners de notifications
            const notificationListener = Notifications.addNotificationReceivedListener(notification => {
              console.log('📩 Notification reçue:', notification);
            });

            const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
              console.log('📩 Notification cliquée:', response);
              console.log('📩 Data reçue:', response.notification.request.content.data);
              const { eventId, action } = response.notification.request.content.data || {};
              
              console.log('📩 Action:', action, 'EventId:', eventId);
              
              if (action === 'open_event' && eventId && navigationRef.current) {
                console.log('📩 Navigation vers EventDetails avec eventId:', eventId);
                navigationRef.current.navigate('EventDetails', { eventId });
              } else if (action === 'open_notifications' && navigationRef.current) {
                console.log('📩 Navigation vers Notifications');
                navigationRef.current.navigate('Notifications');
              } else {
                console.log('📩 Pas de navigation - action:', action, 'eventId:', eventId);
              }
            });

            return () => {
              Notifications.removeNotificationSubscription(notificationListener);
              Notifications.removeNotificationSubscription(responseListener);
            };
          } catch (error) {
            console.error('Erreur notifications:', error);
            // Ne pas faire crasher l'app si les notifications échouent
          }
        };
        
        // Lancer l'initialisation sans await pour ne pas bloquer
        initializeNotifications();
      } else {
        console.log('🔑 [App] Removing user from AsyncStorage');
        await AsyncStorage.removeItem('user');
      }
      
      console.log('🔑 [App] Setting loading to false');
      console.log('🔑 [App] Fin du chargement - setLoading(false)');
      setLoading(false);
    });

    return () => {
      clearTimeout(timeoutId);
      unsubscribe();
      // Nettoyer le service premium
      premiumService.cleanup();
    };
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      {user ? <MainStack /> : <AuthStack />}
    </NavigationContainer>
  );
}
