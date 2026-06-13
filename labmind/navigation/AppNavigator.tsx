import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator, StackCardStyleInterpolator } from '@react-navigation/stack';

import { useAuth } from '../context/AuthContext';
import { Colors } from '../constants/theme';
import type { AuthStackParamList, StudentStackParamList } from '../types';

// Auth screens
import { SplashScreen } from '../app/auth/SplashScreen';
import { LoginScreen } from '../app/auth/LoginScreen';
import { RegisterScreen } from '../app/auth/RegisterScreen';

// Student & Instructor screens
import { DashboardScreen } from '../app/student/DashboardScreen';
import { UploadProtocolScreen } from '../app/student/UploadProtocolScreen';
import { ExperimentOverviewScreen } from '../app/student/ExperimentOverviewScreen';
import { ExperimentSessionScreen } from '../app/student/ExperimentSessionScreen';
import { ImageVerificationScreen } from '../app/student/ImageVerificationScreen';
import { AIChatScreen } from '../app/student/AIChatScreen';
import { ResultsScreen } from '../app/student/ResultsScreen';
import { InstructorDashboardScreen } from '../app/instructor/InstructorDashboardScreen';
import { StudentDetailScreen } from '../app/instructor/StudentDetailScreen';
import { JoinSessionScreen } from '../app/student/JoinSessionScreen';
import { LabSessionDetailScreen } from '../app/instructor/LabSessionDetailScreen';

const AuthStack = createStackNavigator<AuthStackParamList>();
const StudentStack = createStackNavigator<StudentStackParamList>();

const defaultScreenOptions = {
  headerShown: false,
  cardStyle: { backgroundColor: Colors.background },
  gestureEnabled: true,
  transitionSpec: {
    open: { animation: 'timing' as const, config: { duration: 220 } },
    close: { animation: 'timing' as const, config: { duration: 180 } },
  },
  cardStyleInterpolator: (({ current, layouts }) => ({
    cardStyle: {
      transform: [
        {
          translateX: current.progress.interpolate({
            inputRange: [0, 1],
            outputRange: [layouts.screen.width * 0.08, 0],
          }),
        },
      ],
      opacity: current.progress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 1],
      }),
    },
  })) as StackCardStyleInterpolator,
};

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={defaultScreenOptions}>
      <AuthStack.Screen name="Splash" component={SplashScreen} />
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
}

function StudentNavigator({ isInstructor }: { isInstructor: boolean }) {
  return (
    <StudentStack.Navigator screenOptions={defaultScreenOptions}>
      <StudentStack.Screen
        name="Dashboard"
        component={isInstructor ? InstructorDashboardScreen : DashboardScreen}
      />
      <StudentStack.Screen name="UploadProtocol" component={UploadProtocolScreen} />
      <StudentStack.Screen name="ExperimentOverview" component={ExperimentOverviewScreen} />
      <StudentStack.Screen name="ExperimentSession" component={ExperimentSessionScreen} />
      <StudentStack.Screen name="ImageVerification" component={ImageVerificationScreen} />
      <StudentStack.Screen name="AIChat" component={AIChatScreen} />
      <StudentStack.Screen name="Results" component={ResultsScreen} />
      <StudentStack.Screen name="StudentDetail" component={StudentDetailScreen} />
      <StudentStack.Screen name="JoinSession" component={JoinSessionScreen} />
      <StudentStack.Screen name="LabSessionDetail" component={LabSessionDetailScreen} />
    </StudentStack.Navigator>
  );
}

const navStyles = StyleSheet.create({
  loadingBg: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export function AppNavigator() {
  const { user, isLoading } = useAuth();

  // While AsyncStorage is being read, show a dark loading screen
  // so the native splash logo is replaced immediately
  if (isLoading) {
    return (
      <View style={navStyles.loadingBg}>
        <ActivityIndicator color={Colors.accent} size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {user ? <StudentNavigator isInstructor={user.role === 'instructor'} /> : <AuthNavigator />}
    </NavigationContainer>
  );
}
