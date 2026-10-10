import React from 'react';
import { Text, TextProps, StyleSheet, TextStyle } from 'react-native';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';

interface AppTextProps extends TextProps {
  variant?: 'huge' | 'stationCode' | 'title' | 'heading' | 'subheading' | 'bodyLg' | 'body' | 'bodySm' | 'caption' | 'tiny' | 'micro';
  weight?: 'regular' | 'medium' | 'semibold' | 'bold' | 'heavy';
  color?: 'primary' | 'secondary' | 'muted' | 'orange' | 'scarlet' | 'creme' | 'lightCreme' | 'success' | 'warning' | 'white' | 'dark' | 'onOrange';
  center?: boolean;
  uppercase?: boolean;
  letterSpacing?: number;
}

export const AppText: React.FC<AppTextProps> = ({
  children,
  variant = 'body',
  weight = 'regular',
  color = 'primary',
  center = false,
  uppercase = false,
  letterSpacing,
  style,
  ...props
}) => {
  const getFontSize = (): number => {
    switch (variant) {
      case 'huge': return Typography.fontSize.huge;
      case 'stationCode': return Typography.fontSize.stationCode;
      case 'title': return Typography.fontSize.title;
      case 'heading': return Typography.fontSize.heading;
      case 'subheading': return Typography.fontSize.subheading;
      case 'bodyLg': return Typography.fontSize.bodyLg;
      case 'body': return Typography.fontSize.body;
      case 'bodySm': return Typography.fontSize.bodySm;
      case 'caption': return Typography.fontSize.caption;
      case 'tiny': return Typography.fontSize.tiny;
      case 'micro': return Typography.fontSize.micro;
      default: return Typography.fontSize.body;
    }
  };

  const getTextColor = (): string => {
    switch (color) {
      case 'primary': return Colors.textPrimary;
      case 'secondary': return Colors.textSecondary;
      case 'muted': return Colors.textMuted;
      case 'scarlet':
      case 'orange': return Colors.primary;
      case 'creme': return Colors.creme;
      case 'lightCreme': return Colors.cremeLight;
      case 'success': return Colors.success;
      case 'warning': return Colors.warning;
      case 'white': return '#FFFFFF';
      case 'dark': return '#000000';
      case 'onOrange': return Colors.textOnOrangeStub;
      default: return Colors.textPrimary;
    }
  };

  const textStyle: TextStyle = {
    fontSize: getFontSize(),
    fontWeight: Typography.fontWeight[weight],
    color: getTextColor(),
    fontFamily: variant === 'stationCode' ? Typography.fontFamilies.heading : Typography.fontFamilies.body,
    textAlign: center ? 'center' : 'auto',
    textTransform: uppercase ? 'uppercase' : 'none',
    letterSpacing: letterSpacing !== undefined ? letterSpacing : (variant === 'stationCode' ? 0.5 : 0),
  };

  return (
    <Text style={[textStyle, style]} {...props}>
      {children}
    </Text>
  );
};
