import React, { useState } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  Alert,
  Text,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';

import apiClient from '../api/apiClient';
import { useAuth } from '../context/AuthContext';
import { User } from '../types';
import qs from 'qs'; // npm install qs
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../navigation/AppNavigator";

const COLORS = {
  primary: '#5C6BC0',
  primaryDark: '#3F51B5',
  headingText: '#3949AB',
  bodyText: '#757575',
  background: '#E8EAF6',
  card: '#FFFFFF',
  shadow: '#000000',
};
type LoginScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "Login"
>;

type Props = {
  navigation: LoginScreenNavigationProp;
};

const validRoles = ['foreman', 'supervisor', 'project_engineer'] as const;
type ValidRole = (typeof validRoles)[number];

function isValidRole(role: string): role is ValidRole {
  return validRoles.includes(role as ValidRole);
}

const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isEmailFocused, setIsEmailFocused] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);

  const { login } = useAuth();

  const handleLogin = async () => {
    if (isLoading) return;

    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !password) {
      Alert.alert('Hold On', 'Please enter both email and password to log in.');
      return;
    }

    if (!emailRegex.test(email.trim())) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    setIsLoading(true);
    try {
      // Prepare form-urlencoded body - changed username to email
      const data = qs.stringify({
        email, // Changed from username to email
        password,
      });

      const response = await apiClient.post<{
        access_token: string;
        role: string;
        user: User;
      }>('/api/auth/login', data, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });
      
      console.log("🔐 Login Response:", response.data);
      console.log("📌 User From Backend:", response.data.user);
      console.log("📌 User ID From Backend:", response.data.user?.id);
      console.log("📌 Role From Backend:", response.data.role);
      
      const backendRole = response.data.role.toLowerCase();

      if (
        response.data?.access_token &&
        isValidRole(backendRole)
      ) {
        const userData: User = {
          ...response.data.user,
          role: backendRole as "foreman" | "supervisor" | "project_engineer",
        };
        login(userData, response.data.access_token);
      } else {
        Alert.alert('Login Failed', 'Invalid role or response from server.');
      }

    } catch (error: any) {
      const errorMessage =
        error.response?.data?.detail || 'Could not connect to the server. Check your connection.';
      Alert.alert('Login Failed', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={60}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.mainTitle}>Mluis Payroll System</Text>
            <Text style={styles.welcomeText}>Welcome back, sign in to your account.</Text>
          </View>

          <View style={styles.card}>
            <TextInput
              style={[styles.input, isEmailFocused && styles.inputFocused]}
              placeholder="Email Address"
              placeholderTextColor={COLORS.bodyText}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoCorrect={false}
              returnKeyType="next"
              editable={!isLoading}
              onFocus={() => setIsEmailFocused(true)}
              onBlur={() => setIsEmailFocused(false)}
              importantForAutofill="yes"
              textContentType="emailAddress"
            />
            <TextInput
              style={[styles.input, isPasswordFocused && styles.inputFocused]}
              placeholder="Password"
              placeholderTextColor={COLORS.bodyText}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              returnKeyType="done"
              editable={!isLoading}
              onFocus={() => setIsPasswordFocused(true)}
              onBlur={() => setIsPasswordFocused(false)}
              onSubmitEditing={handleLogin}
              importantForAutofill="yes"
              textContentType="password"
            />

            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleLogin}
              activeOpacity={0.8}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={COLORS.card} size="small" />
              ) : (
                <Text style={styles.buttonText}>Log In Securely</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation.navigate("ForgotPassword")}
              style={styles.resetPasswordContainer}
            >
              <Text style={styles.resetPasswordText}>Trouble logging in? Reset Password</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 30,
    justifyContent: 'center',
  },
  header: {
    marginBottom: 50,
    alignItems: 'center',
  },
  mainTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.headingText,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  welcomeText: {
    fontSize: 16,
    fontWeight: '400',
    color: COLORS.bodyText,
    textAlign: 'center',
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 15,
    padding: 25,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  resetPasswordContainer: {
    marginTop: 15,
    alignItems: 'center',
  },
  resetPasswordText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  input: {
    height: 55,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    marginBottom: 20,
    paddingHorizontal: 15,
    fontSize: 16,
    color: COLORS.headingText,
  },
  inputFocused: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.card,
    ...Platform.select({
      ios: { shadowOpacity: 0.1, shadowRadius: 5 },
      android: { elevation: 5 },
    }),
  },
  button: {
    backgroundColor: COLORS.primary,
    paddingVertical: 15,
    borderRadius: 10,
    marginTop: 10,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primaryDark,
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  buttonDisabled: {
    backgroundColor: `${COLORS.primary}80`,
    elevation: 0,
  },
  buttonText: {
    color: COLORS.card,
    fontSize: 18,
    fontWeight: '700',
  },
  linkContainer: {
    alignSelf: 'center',
    marginTop: 25,
    padding: 5,
  },
  linkText: {
    color: COLORS.bodyText,
    fontSize: 14,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
});

export default LoginScreen;
