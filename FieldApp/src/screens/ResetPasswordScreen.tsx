import React, { useState, useEffect } from "react";
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  Alert,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../navigation/AppNavigator";
import { RouteProp } from "@react-navigation/native";
import apiClient from "../api/apiClient";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";

type ResetPasswordNavigationProp = StackNavigationProp<
  RootStackParamList,
  "ResetPassword"
>;
type ResetPasswordRouteProp = RouteProp<RootStackParamList, "ResetPassword">;

type Props = {
  navigation: ResetPasswordNavigationProp;
  route: ResetPasswordRouteProp;
};

const ResetPasswordScreen: React.FC<Props> = ({ route, navigation }) => {
  const { email, otp } = route.params;
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [token, setToken] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Step 1: Verify OTP to get token (only once)
  useEffect(() => {
    const getToken = async () => {
      try {
        const res = await apiClient.post("/api/auth/verify-otp", { email, otp });
        setToken(res.data.token);
      } catch (err: any) {
        Alert.alert(
          "Error",
          err.response?.data?.detail || "OTP verification failed"
        );
        navigation.goBack();
      }
    };
    getToken();
  }, []);

  const resetPassword = async () => {
    if (!token) {
      Alert.alert("Error", "OTP verification token missing");
      return;
    }
    if (password !== confirm) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }
    if (password.length < 8) {
      Alert.alert("Error", "Password must be at least 8 characters");
      return;
    }

    try {
      await apiClient.post("/api/auth/reset-passwordss", {
        email,
        otp,
        token,          // from /verify-otp
        new_password: password,  // from input
      });
      Alert.alert("Success", "Password changed successfully");
      navigation.navigate("Login");
    } catch (err: any) {
      Alert.alert("Error", err.response?.data?.detail || "Something went wrong");
    }
  };

  return (
    <SafeAreaView style={styles.outer}>
      <View style={styles.card}>
        <Text style={styles.title}>Create new password</Text>
        <Text style={styles.subtitle}>
          Your new password must be different from previously used passwords.
        </Text>

        <Text style={styles.label}>Password</Text>
        <View style={styles.inputContainer}>
          <TextInput
            placeholder="Enter new password"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
            style={styles.input}
          />
          <TouchableOpacity
            style={styles.icon}
            onPress={() => setShowPassword((v) => !v)}
          >
            <Icon
              name={showPassword ? "eye-off-outline" : "eye-outline"}
              size={22}
              color="#757575"
            />
          </TouchableOpacity>
        </View>
        <Text style={styles.hint}>Must be at least 8 characters.</Text>

        <Text style={[styles.label, { marginTop: 15 }]}>Confirm Password</Text>
        <View style={styles.inputContainer}>
          <TextInput
            placeholder="Confirm new password"
            secureTextEntry={!showConfirm}
            value={confirm}
            onChangeText={setConfirm}
            style={styles.input}
          />
          <TouchableOpacity
            style={styles.icon}
            onPress={() => setShowConfirm((v) => !v)}
          >
            <Icon
              name={showConfirm ? "eye-off-outline" : "eye-outline"}
              size={22}
              color="#757575"
            />
          </TouchableOpacity>
        </View>
        <Text style={styles.hint}>Both passwords must match.</Text>

        <TouchableOpacity style={styles.button} onPress={resetPassword}>
          <Text style={styles.buttonText}>Reset Password</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default ResetPasswordScreen;

const styles = StyleSheet.create({
  outer: { flex: 1, backgroundColor: "#f2f2f2", justifyContent: "center", alignItems: "center" },
  card: { width: "100%", maxWidth: 400, backgroundColor: "#fff", borderRadius: 15, padding: 28, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
  title: { fontSize: 22, fontWeight: "700", color: "#121212", marginBottom: 8, textAlign: "center" },
  subtitle: { color: "#757575", fontSize: 14, marginBottom: 25, textAlign: "center" },
  label: { fontSize: 15, fontWeight: "600", color: "#333", marginBottom: 5 },
  inputContainer: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#dedede", borderRadius: 8, marginBottom: 2, backgroundColor: "#fafbfd", paddingRight: 10 },
  input: { flex: 1, padding: 12, fontSize: 16, borderRadius: 8, color: "#222" },
  icon: { padding: 4 },
  hint: { color: "#8d8d8d", fontSize: 12, marginBottom: 6, marginLeft: 2 },
  button: { marginTop: 23, backgroundColor: "#5C6BC0", paddingVertical: 15, borderRadius: 8, alignItems: "center", width: "100%" },
  buttonText: { color: "#fff", fontSize: 18, fontWeight: "600", letterSpacing: 0.3 },
});
