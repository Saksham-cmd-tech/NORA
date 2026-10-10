import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '../../theme/colors';
import { AppText } from './AppText';

interface StatusBadgeProps {
  label: string;
  variant?: 'success' | 'orange' | 'neutral' | 'dark' | 'outlineOrange';
  dot?: boolean;
  style?: ViewStyle;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  label,
  variant = 'neutral',
  dot = false,
  style,
}) => {
  const getContainerStyle = (): ViewStyle => {
    switch (variant) {
      case 'success':
        return {
          backgroundColor: Colors.successMuted,
          borderColor: 'rgba(16, 185, 129, 0.3)',
          borderWidth: 1,
        };
      case 'orange':
        return {
          backgroundColor: Colors.primaryMuted,
          borderColor: Colors.borderOrange,
          borderWidth: 1,
        };
      case 'outlineOrange':
        return {
          backgroundColor: 'transparent',
          borderColor: Colors.primary,
          borderWidth: 1,
        };
      case 'dark':
        return {
          backgroundColor: Colors.surfaceLowest,
          borderColor: Colors.borderSubtle,
          borderWidth: 1,
        };
      case 'neutral':
      default:
        return {
          backgroundColor: Colors.surfaceHigh,
          borderColor: Colors.borderSubtle,
          borderWidth: 1,
        };
    }
  };

  const getTextColor = () => {
    switch (variant) {
      case 'success': return 'success';
      case 'orange': return 'orange';
      case 'outlineOrange': return 'orange';
      case 'dark': return 'secondary';
      case 'neutral': return 'secondary';
    }
  };

  return (
    <View style={[styles.badge, getContainerStyle(), style]}>
      {dot && (
        <View
          style={[
            styles.dot,
            { backgroundColor: variant === 'success' ? Colors.success : Colors.primary },
          ]}
        />
      )}
      <AppText
        variant="micro"
        weight="bold"
        uppercase
        letterSpacing={0.8}
        color={getTextColor()}
      >
        {label}
      </AppText>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginRight: 5,
  },
});
