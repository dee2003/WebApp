import axios from "axios";

export const API_URL = "http://127.0.0.1:8000/api";
// const API_URL = process.env.REACT_APP_API_URL;

// ✅ Create axios instance
export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// ✅ Request Interceptor
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");

    console.log("%c[API DEBUG] Preparing request:", "color: #03A9F4; font-weight: bold;");
    console.log("➡️ URL:", config.baseURL + config.url);
    console.log("➡️ Method:", config.method);
    console.log("➡️ Token found in localStorage:", token ? "✅ Yes" : "❌ No");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log("✅ Attached Authorization header:", config.headers.Authorization);
    } else {
      delete config.headers.Authorization;
      console.warn("⚠️ No token found. This request will be unauthenticated!");
    }

    return config;
  },
  (error) => {
    console.error("❌ Request setup failed:", error);
    return Promise.reject(error);
  }
);

// ✅ Response Interceptor
apiClient.interceptors.response.use(
  (response) => {
    console.log("%c[API DEBUG] ✅ Response received:", "color: #4CAF50; font-weight: bold;");
    console.log("➡️ URL:", response.config.url);
    console.log("➡️ Status:", response.status);
    return response;
  },
  (error) => {
    if (error.response) {
      console.group("%c[API DEBUG] ❌ API Error", "color: #F44336; font-weight: bold;");
      console.log("➡️ URL:", error.config?.url);
      console.log("➡️ Status:", error.response.status);
      console.log("➡️ Response:", error.response.data);
      console.groupEnd();

      // Handle unauthorized error
      if (error.response.status === 401) {
        console.warn("🚫 Token expired or invalid — logging out.");
        localStorage.removeItem("token");
        localStorage.removeItem("user_role");
        // Optional: redirect to login if your app supports routing
        // window.location.href = "/login";
      }
    } else {
      console.error("❌ No response from server:", error);
    }

    return Promise.reject(error);
  }
);
