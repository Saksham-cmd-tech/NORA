import React from 'react';
import {
  TouchableOpacity,
  TouchableOpacityProps,
  StyleSheet,
  ActivityIndicator,
  View,
  ViewStyle,
} from 'react-native';
import { Colors } from '../../theme/colors';
import { Spacing } from '../../theme/spacing';
import { AppText } from './AppText';

interface AppButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'actionPill' | 'orangeOutline';
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const AppButton: React.FC<AppButtonProps> = ({
  title,
  variant = 'primary',
  icon,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  fullWidth = true,
  size = 'md',
  style,
  ...props
}) => {
  const getContainerStyle = (): ViewStyle => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: Colors.primary,
          borderWidth: 0,
        };
      case 'secondary':
        return {
          backgroundColor: Colors.surfaceHigh,
          borderColor: Colors.borderSubtle,
          borderWidth: 1,
        };
      case 'actionPill':
        return {
          backgroundColor: Colors.surface,
          borderColor: Colors.borderSubtle,
          borderWidth: 1,
          borderRadius: Spacing.borderRadiusMd,
          paddingVertical: 10,
          paddingHorizontal: 12,
        };
      case 'orangeOutline':
        return {
          backgroundColor: Colors.primaryMuted,
          borderColor: Colors.primary,
          borderWidth: 1,
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          borderColor: Colors.borderSubtle,
          borderWidth: 1,
        };
    }
  };

  const getPadding = () => {
    if (variant === 'actionPill') return {};
    switch (size) {
      case 'sm': return { paddingVertical: 8, paddingHorizontal: 14, minHeight: 36 };
      case 'md': return { paddingVertical: 14, paddingHorizontal: 18, minHeight: 48 };
      case 'lg': return { paddingVertical: 16, paddingHorizontal: 20, minHeight: 54 };
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      disabled={disabled || loading}
      style={[
        styles.base,
        getContainerStyle(),
        getPadding(),
        fullWidth && styles.fullWidth,
        disabled && styles.disabled,
        style,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#000000' : Colors.primary} size="small" />
      ) : (
        <View style={styles.contentRow}>
          {icon && iconPosition === 'left' && <View style={styles.iconLeft}>{icon}</View>}
          <AppText
            variant={size === 'sm' || variant === 'actionPill' ? 'caption' : 'body'}
            weight={variant === 'primary' ? 'heavy' : 'medium'}
            color={variant === 'primary' ? 'dark' : (variant === 'orangeOutline' ? 'orange' : 'primary')}
            uppercase={variant === 'actionPill'}
          >
            {title}
          </AppText>
          {icon && iconPosition === 'right' && <View style={styles.iconRight}>{icon}</View>}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: Spacing.borderRadiusMd,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: {
    width: '100%',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLeft: {
    marginRight: 8,
  },
  iconRight: {
    marginLeft: 8,
  },
  disabled: {
    opacity: 0.5,
  },
});
