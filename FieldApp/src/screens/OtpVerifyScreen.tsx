import React, { useState } from "react";
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../navigation/AppNavigator";
import { RouteProp } from "@react-navigation/native";
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
  const [otp, setOtp] = useState("");

  const verifyOtp = async () => {
    try {
await apiClient.post("/api/auth/verify-otp", { email, otp });

      navigation.navigate("ResetPassword", { email, otp });

    } catch (err: any) {
      Alert.alert("Error", err.response?.data?.detail || "Invalid OTP");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Enter OTP sent to {email}</Text>

      <TextInput
        placeholder="6-digit OTP"
        value={otp}
        onChangeText={setOtp}
        keyboardType="numeric"
        style={styles.input}
      />

      <TouchableOpacity style={styles.button} onPress={verifyOtp}>
        <Text style={styles.buttonText}>Verify OTP</Text>
      </TouchableOpacity>
    </View>
  );
};

export default OtpVerifyScreen;

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: "center" },
  label: { fontSize: 18, marginBottom: 10 },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 16 },
  button: {
    marginTop: 20,
    backgroundColor: "#5C6BC0",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontSize: 18, fontWeight: "600" },
});
