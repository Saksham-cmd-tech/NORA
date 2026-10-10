import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { AppText } from './AppText';

interface SectionHeaderProps {
  title: string;
  icon?: React.ReactNode;
  rightElement?: React.ReactNode;
  subtitle?: string;
  style?: ViewStyle;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  icon,
  rightElement,
  subtitle,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.leftRow}>
        {icon && <View style={styles.icon}>{icon}</View>}
        <View>
          <AppText variant="caption" weight="bold" uppercase letterSpacing={1} color="muted">
            {title}
          </AppText>
          {subtitle && (
            <AppText variant="tiny" color="secondary" style={styles.subtitle}>
              {subtitle}
            </AppText>
          )}
        </View>
      </View>
      {rightElement && <View style={styles.right}>{rightElement}</View>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    marginTop: 18,
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 6,
  },
  subtitle: {
    marginTop: 2,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
