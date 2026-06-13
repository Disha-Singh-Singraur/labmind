import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Colors, Typography, Spacing } from '../constants/theme';
import type { ExperimentStep } from '../types';

interface StepTimelineProps {
  steps: ExperimentStep[];
  currentStep: number;
}

function StepNode({ step, isCompleted, isCurrent }: {
  step: ExperimentStep;
  isCompleted: boolean;
  isCurrent: boolean;
}) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!isCurrent) return;
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.4, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [isCurrent, pulseAnim]);

  const nodeColor = isCompleted || isCurrent ? Colors.accent : Colors.textDim;
  const nodeBg = isCompleted ? Colors.accent : isCurrent ? Colors.accentGlow : 'transparent';

  return (
    <View style={styles.nodeRow}>
      {/* Line + node column */}
      <View style={styles.lineCol}>
        <View style={[styles.nodeDot, { borderColor: nodeColor, backgroundColor: nodeBg }]}>
          {isCurrent && (
            <Animated.View
              style={[
                styles.pulseRing,
                { borderColor: Colors.accentDim, transform: [{ scale: pulseAnim }] },
              ]}
            />
          )}
          {isCompleted && (
            <View style={styles.completedInner} />
          )}
        </View>
      </View>

      {/* Step label */}
      <View style={styles.labelCol}>
        <Text style={[styles.stepNum, { color: isCompleted || isCurrent ? Colors.accent : Colors.textDim }]}>
          {String(step.step_number).padStart(2, '0')}
        </Text>
        <Text
          style={[
            styles.stepTitle,
            {
              color: isCurrent
                ? Colors.textPrimary
                : isCompleted
                ? Colors.textSecondary
                : Colors.textDim,
            },
          ]}
        >
          {step.title}
        </Text>
      </View>
    </View>
  );
}

export function StepTimeline({ steps, currentStep }: StepTimelineProps) {
  return (
    <View style={styles.container}>
      {steps.map((step, idx) => {
        const isCompleted = step.step_number < currentStep;
        const isCurrent = step.step_number === currentStep;
        const isLast = idx === steps.length - 1;

        return (
          <View key={step.id} style={styles.stepWrapper}>
            <StepNode step={step} isCompleted={isCompleted} isCurrent={isCurrent} />
            {!isLast && (
              <View style={styles.connector}>
                <View
                  style={[
                    styles.connectorLine,
                    { backgroundColor: isCompleted ? Colors.accentDim : Colors.textDim },
                  ]}
                />
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.sm,
  },
  stepWrapper: {
    flexDirection: 'column',
  },
  nodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  lineCol: {
    width: 24,
    alignItems: 'center',
  },
  nodeDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
  },
  completedInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.background,
  },
  labelCol: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  stepNum: {
    fontFamily: Typography.fontMonoBold,
    fontSize: 11,
    letterSpacing: 0.5,
  },
  stepTitle: {
    fontFamily: Typography.fontBody,
    fontSize: 13,
    flex: 1,
  },
  connector: {
    paddingLeft: 12,
    height: 20,
  },
  connectorLine: {
    width: 1,
    flex: 1,
    opacity: 0.4,
  },
});
