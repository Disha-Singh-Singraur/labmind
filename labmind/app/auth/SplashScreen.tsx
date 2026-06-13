import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { StackScreenProps } from '@react-navigation/stack';
import type { AuthStackParamList } from '../../types';
import { Colors, Typography, Spacing } from '../../constants/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type Props = StackScreenProps<AuthStackParamList, 'Splash'>;

export function SplashScreen({ navigation }: Props) {
  const scanY = useRef(new Animated.Value(-4)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const tagOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fade in logo
    Animated.sequence([
      Animated.timing(logoOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(tagOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();

    // Scan line loop
    Animated.loop(
      Animated.timing(scanY, {
        toValue: SCREEN_HEIGHT + 4,
        duration: 2200,
        useNativeDriver: true,
      }),
    ).start();

    // Navigate after 2.2s
    const timer = setTimeout(() => {
      navigation.replace('Login');
    }, 2200);

    return () => clearTimeout(timer);
  }, [navigation, scanY, logoOpacity, tagOpacity]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Scan line */}
      <Animated.View
        style={[styles.scanLine, { transform: [{ translateY: scanY }] }]}
        pointerEvents="none"
      />

      <View style={styles.centerContent}>
        {/* Logo block */}
        <Animated.View style={[styles.logoBlock, { opacity: logoOpacity }]}>
          <View style={styles.logoRow}>
            <View style={styles.accentSquare} />
            <Text style={styles.logoText}>LABMIND</Text>
          </View>
          <View style={styles.logoUnderline} />
        </Animated.View>

        <Animated.Text style={[styles.tagline, { opacity: tagOpacity }]}>
          AI-POWERED LABORATORY ASSISTANT
        </Animated.Text>

        <Animated.Text style={[styles.version, { opacity: tagOpacity }]}>
          PHASE 1 · v1.0.0
        </Animated.Text>
      </View>

      {/* Bottom status */}
      <Text style={styles.status}>INITIALISING SYSTEMS...</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 2,
    backgroundColor: Colors.accent,
    opacity: 0.12,
    zIndex: 10,
  },
  centerContent: {
    alignItems: 'center',
    gap: Spacing.lg,
  },
  logoBlock: {
    alignItems: 'center',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  accentSquare: {
    width: 8,
    height: 8,
    backgroundColor: Colors.accent,
  },
  logoText: {
    fontFamily: Typography.fontMonoBold,
    fontSize: 36,
    color: Colors.textPrimary,
    letterSpacing: 8,
  },
  logoUnderline: {
    width: '80%',
    height: 1,
    backgroundColor: Colors.accent,
    marginTop: Spacing.sm,
    opacity: 0.6,
  },
  tagline: {
    fontFamily: Typography.fontMono,
    fontSize: 11,
    letterSpacing: 2.5,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  version: {
    fontFamily: Typography.fontMono,
    fontSize: 10,
    color: Colors.textDim,
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  status: {
    position: 'absolute',
    bottom: Spacing.xxxl,
    fontFamily: Typography.fontMono,
    fontSize: 9,
    letterSpacing: 2,
    color: Colors.textDim,
  },
});
