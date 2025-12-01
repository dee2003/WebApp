// WeatherLocationCard.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import { PERMISSIONS, request, RESULTS } from 'react-native-permissions';

type Location = {
  latitude: number;
  longitude: number;
};

type Address = {
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
};

const WeatherLocationCard: React.FC = () => {
  const [location, setLocation] = useState<Location | null>(null);
  const [address, setAddress] = useState<Address | null>(null);
  const [temperature, setTemperature] = useState<string>('');
  const [weatherDesc, setWeatherDesc] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  const log = (message: string, obj?: any) => {
    console.log('[WeatherLocationCard]', message, obj || '');
  };

  const requestLocationPermission = async (): Promise<boolean> => {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'App needs access to your location to show weather info.',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } else {
        const result = await request(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE);
        return result === RESULTS.GRANTED;
      }
    } catch (err) {
      log('Permission request error', err);
      return false;
    }
  };

  const fetchLocation = async () => {
    setLoading(true);
    const hasPermission = await requestLocationPermission();

    if (!hasPermission) {
      setWeatherDesc('Permission denied');
      setTemperature('');
      setLoading(false);
      return;
    }

    Geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setLocation({ latitude, longitude });
        fetchAddress(latitude, longitude);
      },
      (err) => {
        log('Location error', err);
        setWeatherDesc('Location unavailable');
        setTemperature('');
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 10000 }
    );
  };

  const fetchAddress = async (lat: number, lon: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`
      );
      const text = await response.text();
      const data = JSON.parse(text);

      const addr: Address = {
        street: data.address?.road || data.address?.pedestrian || data.address?.neighbourhood || 'No street data',
        city: data.address?.city || data.address?.town || data.address?.village || 'No city data',
        state: data.address?.state || 'No state data',
        postalCode: data.address?.postcode || 'N/A',
        country: data.address?.country || 'No country data',
      };
      setAddress(addr);
      fetchWeather(lat, lon);
    } catch (err) {
      log('Reverse geocode error', err);
      setAddress({
        street: 'No street data',
        city: 'No city data',
        state: 'No state data',
        postalCode: 'N/A',
        country: 'No country data',
      });
      if (location) fetchWeather(location.latitude, location.longitude);
    }
  };

  const fetchWeather = async (lat: number, lon: number) => {
    try {
      const response = await fetch(`https://wttr.in/${lat},${lon}?format=j1`);
      const data = await response.json();
      const tempC = parseFloat(data.current_condition[0].temp_C);
      const tempF = ((tempC * 9) / 5 + 32).toFixed(1);
      const desc = data.current_condition[0].weatherDesc[0].value;

      setTemperature(`${tempF}°F`);
      setWeatherDesc(desc);
      setLoading(false);
    } catch (err) {
      log('Weather fetch error', err);
      setTemperature('N/A');
      setWeatherDesc('Weather unavailable');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocation();
  }, []);

  if (loading) return <ActivityIndicator size="large" style={{ marginTop: 20 }} />;

  return (
    <View>
      <Text style={styles.label}>Location:</Text>
      {address ? (
        <Text style={styles.value}>
          {address.street}, {address.city}, {address.state}, {address.postalCode}, {address.country}
        </Text>
      ) : (
        <Text style={styles.value}>Fetching address...</Text>
      )}

      <Text style={styles.label}>Temperature:</Text>
      <Text style={styles.value}>{temperature}</Text>

      <Text style={styles.label}>Weather:</Text>
      <Text style={styles.value}>{weatherDesc}</Text>

      {(weatherDesc === 'Permission denied' || weatherDesc === 'Location unavailable') && (
        <TouchableOpacity style={styles.retryButton} onPress={fetchLocation}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  label: { fontWeight: 'bold', fontSize: 14, color: '#333', marginTop: 8 },
  value: { fontSize: 14, color: '#555', marginBottom: 4 },
  retryButton: {
    marginTop: 10,
    alignSelf: 'flex-start',
    backgroundColor: '#137fec',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  retryText: { color: '#fff', fontWeight: 'bold' },
});

export default WeatherLocationCard;
