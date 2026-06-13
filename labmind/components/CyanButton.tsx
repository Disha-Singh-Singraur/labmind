import React, { useRef } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  Animated,
  StyleProp,
} from 'react-native';
import { Colors, Typography, BorderRadius, Spacing } from '../constants/theme';
import { AIThinkingIndicator } from './AIThinkingIndicator';

interface CyanButtonProps {
  label: string;
  onPress: () => void;
  loading?: boolean;
  variant?: 'primary' | 'ghost';
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  disabled?: boolean;
}

export function CyanButton({
  label,
  onPress,
  loading = false,
  variant = 'primary',
  style,
  textStyle,
  disabled = false,
}: CyanButtonProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 50,
      bounciness: 0,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 0,
    }).start();
  };

  const isDisabled = disabled || loading;

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabled}
        activeOpacity={0.85}
        style={[
          styles.base,
          variant === 'primary' ? styles.primary : styles.ghost,
          isDisabled && styles.disabled,
          style,
        ]}
      >
        {loading ? (
          <AIThinkingIndicator />
        ) : (
          <Text
            style={[
              styles.label,
              variant === 'ghost' && styles.ghostLabel,
              isDisabled && styles.disabledLabel,
              textStyle,
            ]}
          >
            {label}
          </Text>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  primary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    borderBottomColor: Colors.accent,
    borderBottomWidth: 2,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    paddingHorizontal: Spacing.sm,
  },
  disabled: {
    opacity: 0.45,
  },
  label: {
    fontFamily: Typography.fontMono,
    fontSize: 13,
    letterSpacing: 0.08 * 13,
    color: Colors.accent,
    textTransform: 'uppercase',
  },
  ghostLabel: {
    color: Colors.accent,
    fontSize: 12,
  },
  disabledLabel: {
    color: Colors.textDim,
  },
});
