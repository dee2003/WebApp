import React, { useState } from "react";
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../navigation/AppNavigator";
import apiClient from "../api/apiClient";

type ForgotPasswordScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "ForgotPassword"
>;

type Props = {
  navigation: ForgotPasswordScreenNavigationProp;
};

const ForgotPasswordScreen: React.FC<Props> = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  // Helper to validate email format before hitting the API
  const validateEmail = (email: string) => {
    const re = /\S+@\S+\.\S+/;
    return re.test(email);
  };

  const sendOtp = async () => {
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail) {
      Alert.alert("Email required", "Please enter your email.");
      return;
    }

    if (!validateEmail(trimmedEmail)) {
      Alert.alert("Invalid Email", "Please enter a valid email address.");
      return;
    }

    try {
      setLoading(true);

      /**
       * BACKEND LOGIC EXPECTATION:
       * Your API should check if the email exists in the DB.
       * - If found: Send OTP and return 200 OK.
       * - If NOT found: Return 404 Not Found or 400 Bad Request.
       */
      const response = await apiClient.post("/api/auth/send-reset-otp", { 
        email: trimmedEmail 
      });

      // If we reach here, it means the request was successful (200 OK)
      Alert.alert("Success", "Reset instructions have been sent to your email.");
      
      // Navigate to the next screen only on success
      navigation.navigate("VerifyOtp", { email: trimmedEmail });

    } catch (err: any) {
      // If the backend returns a 404 or 400, it falls into this block
      const status = err?.response?.status;
      const errorMessage = err?.response?.data?.detail;

      if (status === 404) {
        Alert.alert("Account Not Found", "This email address is not registered.");
      } else if (status === 429) {
        Alert.alert("Too Many Requests", "Please wait a moment before trying again.");
      } else {
        Alert.alert(
          "Error",
          errorMessage || "Something went wrong. Please check your connection."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const isDisabled = !email.trim() || loading;

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.container}>
        <View style={styles.card}>
          <View style={styles.iconWrapper}>
            <Text style={styles.iconText}>🔒</Text>
          </View>

          <Text style={styles.title}>Forgot password?</Text>
          <Text style={styles.subtitle}>
            No worries, we’ll send you reset instructions.
          </Text>

          <View style={styles.fieldWrapper}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              placeholder="Enter your email"
              value={email}
              onChangeText={setEmail}
              style={styles.input}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              placeholderTextColor="#9CA3AF"
              editable={!loading}
            />
          </View>

          <TouchableOpacity
            style={[styles.button, isDisabled && styles.buttonDisabled]}
            onPress={sendOtp}
            disabled={isDisabled}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.buttonText}>Reset password</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backRow}
            onPress={() => navigation.goBack()}
            disabled={loading}
          >
            <Text style={styles.backArrow}>←</Text>
            <Text style={styles.backText}>Back to log in</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

export default ForgotPasswordScreen;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 32,
    paddingHorizontal: 24,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
    // Use a percentage or smaller margin if the screen feels too empty
    marginTop: -40, 
  },
  iconWrapper: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#EEF2FF",
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  iconText: {
    fontSize: 22,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 24,
  },
  fieldWrapper: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: "#374151",
    marginBottom: 6,
    fontWeight: "500",
  },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: "#111827",
    backgroundColor: "#FFFFFF",
  },
  button: {
    backgroundColor: "#5C6BC0",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    minHeight: 48,
  },
  buttonDisabled: {
    backgroundColor: "#9FA8DA", // Lighter shade to indicate disabled state
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  backRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  backArrow: {
    fontSize: 14,
    color: "#6B7280",
    marginRight: 4,
  },
  backText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
});