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

type ResetPasswordNavigationProp = StackNavigationProp<
  RootStackParamList,
  "ResetPassword"
>;

type ResetPasswordRouteProp = RouteProp<
  RootStackParamList,
  "ResetPassword"
>;

type Props = {
  navigation: ResetPasswordNavigationProp;
  route: ResetPasswordRouteProp;
};

const ResetPasswordScreen: React.FC<Props> = ({ route, navigation }) => {
  const { email, otp } = route.params;
  const [password, setPassword] = useState("");

  const resetPassword = async () => {
    try {
      await apiClient.post("/api/auth/reset-password", {
        email,
        otp,
        new_password: password,
      });

      Alert.alert("Success", "Password changed successfully");
      navigation.navigate("Login");

    } catch (err: any) {
      Alert.alert("Error", err.response?.data?.detail || "Something went wrong");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Enter new password</Text>

      <TextInput
        placeholder="New Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={styles.input}
      />

      <TouchableOpacity style={styles.button} onPress={resetPassword}>
        <Text style={styles.buttonText}>Reset Password</Text>
      </TouchableOpacity>
    </View>
  );
};

export default ResetPasswordScreen;

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
