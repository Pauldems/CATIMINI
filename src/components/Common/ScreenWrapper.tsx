import React from 'react';
import { View, StyleSheet } from 'react-native';

interface ScreenWrapperProps {
  children: React.ReactNode;
  style?: any;
}

export default function ScreenWrapper({ children, style }: ScreenWrapperProps) {
  return (
    <View style={[styles.container, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingBottom: 100, // Espace pour la barre de navigation flottante
  },
});