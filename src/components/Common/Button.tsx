import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle, ActivityIndicator } from 'react-native';
import { Colors } from '../../theme/colors';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  style,
  textStyle,
  fullWidth = false,
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: Colors.primary,
          borderColor: Colors.primary,
          borderWidth: 2,
        };
      case 'secondary':
        return {
          backgroundColor: Colors.secondary,
          borderColor: Colors.secondary,
          borderWidth: 2,
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          borderColor: Colors.primary,
          borderWidth: 2,
        };
      case 'danger':
        return {
          backgroundColor: '#DC3545',
          borderColor: '#DC3545',
          borderWidth: 2,
        };
      default:
        return {
          backgroundColor: Colors.primary,
          borderColor: Colors.primary,
          borderWidth: 2,
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          paddingHorizontal: 12,
          paddingVertical: 8,
          minHeight: 36,
        };
      case 'medium':
        return {
          paddingHorizontal: 16,
          paddingVertical: 12,
          minHeight: 44,
        };
      case 'large':
        return {
          paddingHorizontal: 20,
          paddingVertical: 16,
          minHeight: 52,
        };
      default:
        return {
          paddingHorizontal: 16,
          paddingVertical: 12,
          minHeight: 44,
        };
    }
  };

  const getTextColor = () => {
    if (disabled) return Colors.textMuted;
    if (variant === 'outline') return Colors.primary;
    return Colors.white;
  };

  const getTextSize = () => {
    switch (size) {
      case 'small':
        return 14;
      case 'medium':
        return 16;
      case 'large':
        return 18;
      default:
        return 16;
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        getVariantStyles(),
        getSizeStyles(),
        fullWidth && styles.fullWidth,
        disabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator size="small" color={getTextColor()} />
      ) : (
        <Text
          style={[
            styles.text,
            {
              color: getTextColor(),
              fontSize: getTextSize(),
            },
            textStyle,
          ]}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
    shadowOpacity: 0,
    elevation: 0,
  },
  text: {
    fontWeight: '600',
    textAlign: 'center',
  },
});