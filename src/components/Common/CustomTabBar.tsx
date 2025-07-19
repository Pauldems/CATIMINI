import React, { useRef, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Text,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../theme/colors';

interface CustomTabBarProps {
  state: any;
  descriptors: any;
  navigation: any;
}

export default function CustomTabBar({ state, descriptors, navigation }: CustomTabBarProps) {
  const insets = useSafeAreaInsets();
  const buttonScale = useRef(new Animated.Value(1)).current;
  const buttonRotation = useRef(new Animated.Value(0)).current;

  const handleCreatePress = () => {
    // Animation du bouton : scale + rotation
    Animated.sequence([
      Animated.parallel([
        Animated.timing(buttonScale, {
          toValue: 1.2,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(buttonRotation, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(buttonScale, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(buttonRotation, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Navigation avec animation personnalisée
    navigation.navigate('CreateEvent');
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      {/* Dégradé invisible qui apparaît seulement quand le contenu passe dessus */}
      <LinearGradient
        colors={['transparent', 'rgba(250, 250, 250, 0.95)']}
        style={styles.gradientMask}
        pointerEvents="none"
      />
      
      <View style={styles.tabBar}>
        {state.routes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];
          const label = options.tabBarLabel || options.title || route.name;
          const isFocused = state.index === index;
          const isCreateButton = route.name === 'CreateEvent';

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          if (isCreateButton) {
            // Retourner un espace vide pour le bouton créer
            return <View key={index} style={styles.tabItem} />;
          }

          const iconName = getIconName(route.name, isFocused);

          return (
            <TouchableOpacity
              key={index}
              onPress={onPress}
              style={styles.tabItem}
            >
              <Ionicons
                name={iconName}
                size={24}
                color={isFocused ? Colors.white : Colors.gray400}
              />
              <Text style={[
                styles.label,
                { color: isFocused ? Colors.white : Colors.gray400 }
              ]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Bouton flottant pour créer avec animation */}
      <TouchableOpacity
        style={styles.createButtonContainer}
        onPress={handleCreatePress}
        activeOpacity={0.8}
      >
        <Animated.View
          style={[
            styles.createButton,
            {
              transform: [
                { scale: buttonScale },
                {
                  rotate: buttonRotation.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', '45deg'],
                  }),
                },
              ],
            },
          ]}
        >
          <Ionicons name="add" size={32} color={Colors.white} />
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
}

function getIconName(routeName: string, isFocused: boolean): any {
  const icons: { [key: string]: { focused: any; unfocused: any } } = {
    Availability: {
      focused: 'calendar',
      unfocused: 'calendar-outline',
    },
    Friends: {
      focused: 'people',
      unfocused: 'people-outline',
    },
    MyEvents: {
      focused: 'list',
      unfocused: 'list-outline',
    },
    Settings: {
      focused: 'settings',
      unfocused: 'settings-outline',
    },
  };

  return icons[routeName]?.[isFocused ? 'focused' : 'unfocused'] || 'ellipse-outline';
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
    height: 100,
  },
  gradientMask: {
    position: 'absolute',
    bottom: -10,
    left: 0,
    right: 0,
    height: 80,
    zIndex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.secondary,
    borderTopWidth: 0,
    paddingTop: 12,
    paddingBottom: 8,
    paddingHorizontal: 10,
    marginHorizontal: 10,
    marginBottom: 10,
    borderRadius: 25,
    zIndex: 2,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  label: {
    fontSize: 10,
    marginTop: 4,
    fontWeight: '600',
  },
  createButtonContainer: {
    position: 'absolute',
    bottom: 25,
    left: '50%',
    marginLeft: -32,
    width: 64,
    height: 64,
    zIndex: 3,
  },
  createButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: Colors.accent,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
      },
      android: {
        elevation: 12,
      },
    }),
  },
});