import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../navigation/AppNavigator";
import apiClient from "../api/apiClient";

type VerifyOtpNavigationProp = StackNavigationProp<
  RootStackParamList,
  "VerifyOtp"
>;
type VerifyOtpRouteProp = RouteProp<RootStackParamList, "VerifyOtp">;

type Props = {
  navigation: VerifyOtpNavigationProp;
  route: VerifyOtpRouteProp;
};

const OtpVerifyScreen: React.FC<Props> = ({ route, navigation }) => {
  const { email } = route.params;

  // Use an array for 6 digits
  const [otp, setOtp] = useState(Array(6).fill(""));
  const [loading, setLoading] = useState(false);

  // Create refs dynamically for each TextInput
  const inputRefs = useRef<(TextInput | null)[]>([]);

  const handleChange = (index: number) => (value: string) => {
    if (value.length > 1) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Move focus to next input if value exists
    if (value && index < inputRefs.current.length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleBackspace = (index: number) => (e: any) => {
    if (e.nativeEvent.key === "Backspace" && otp[index] === "" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const verifyOtp = async () => {
    const code = otp.join("");
    if (code.length < 6) {
      Alert.alert("Invalid code", "Please enter the 6‑digit verification code.");
      return;
    }

    try {
      setLoading(true);
      await apiClient.post("/api/auth/verify-otp", { email, otp: code });
      navigation.navigate("ResetPassword", { email, otp: code });
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.detail || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async () => {
    try {
      await apiClient.post("/api/auth/send-reset-otp", { email });
      Alert.alert("Sent", "A new code has been sent to your email.");
    } catch {
      Alert.alert("Error", "Could not resend code. Please try again.");
    }
  };

  const isDisabled = otp.some(d => d === "") || loading;

  return (
    <View style={styles.root}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
        </TouchableOpacity>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.container}>
        <Text style={styles.title}>Enter Verification code</Text>
        <Text style={styles.subtitle}>
          We’ve sent a 6‑digit code to {email}
        </Text>

        <View style={styles.otpRow}>
          {otp.map((value, index) => (
            <TextInput
              key={index}
ref={ref => { inputRefs.current[index] = ref; }}
              style={styles.otpInput}
              keyboardType="number-pad"
              maxLength={1}
              value={value}
              onChangeText={handleChange(index)}
              onKeyPress={handleBackspace(index)}
            />
          ))}
        </View>

        <View style={styles.resendRow}>
          <Text style={styles.resendText}>If you didn’t receive a code? </Text>
          <TouchableOpacity onPress={resendOtp} disabled={loading}>
            <Text style={styles.resendLink}>Resend</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.button, isDisabled && styles.buttonDisabled]}
          onPress={verifyOtp}
          disabled={isDisabled}
          activeOpacity={0.9}
        >
          <Text style={styles.buttonText}>
            {loading ? "Verifying..." : "Verify"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default OtpVerifyScreen;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F4F4F7",
    paddingTop: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  backIcon: {
    fontSize: 20,
    color: "#111827",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginRight: 24,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 32,
  },
  otpRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 24,
    marginBottom: 16,
  },
  otpInput: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
    textAlign: "center",
    fontSize: 20,
    color: "#111827",
  },
  resendRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 32,
  },
  resendText: {
    fontSize: 13,
    color: "#6B7280",
  },
  resendLink: {
    fontSize: 13,
    color: "#5C6BC0",
    fontWeight: "500",
  },
  button: {
    backgroundColor: "#5C6BC0",
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: "center",
    marginHorizontal: 16,
  },
  buttonDisabled: {
    backgroundColor: "#5C6BC0",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
