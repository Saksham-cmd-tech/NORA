import React from 'react';
import { View, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '../../theme/colors';
import { Spacing } from '../../theme/spacing';
import { AppText } from './AppText';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
  count?: number;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  selectedValue: T;
  onSelect: (value: T) => void;
  style?: ViewStyle;
}

export function SegmentedControl<T extends string>({
  options,
  selectedValue,
  onSelect,
  style,
}: SegmentedControlProps<T>) {
  return (
    <View style={[styles.container, style]}>
      {options.map((option) => {
        const isSelected = option.value === selectedValue;
        return (
          <TouchableOpacity
            key={option.value}
            activeOpacity={0.8}
            onPress={() => onSelect(option.value)}
            style={[styles.tab, isSelected && styles.tabActive]}
          >
            {option.icon && <View style={styles.icon}>{option.icon}</View>}
            <AppText
              variant="caption"
              weight="heavy"
              color={isSelected ? 'dark' : 'secondary'}
              uppercase
              letterSpacing={0.5}
            >
              {option.count !== undefined ? `${option.label} (${option.count})` : option.label}
            </AppText>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceLow,
    borderRadius: Spacing.borderRadiusMd,
    padding: 3,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: Spacing.borderRadiusSm,
  },
  tabActive: {
    backgroundColor: Colors.primary,
  },
  icon: {
    marginRight: 6,
  },
});
