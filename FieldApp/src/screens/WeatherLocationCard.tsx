// WeatherLocationCard.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
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

type Props = {
  onWeatherChange?: (weather: string) => void;
  onTemperatureChange?: (temperature: string) => void;
  onLocationChange?: (location: string) => void;
};

const WeatherLocationCard: React.FC<Props> = ({
  onWeatherChange,
  onTemperatureChange,
  onLocationChange,
}) => {
  const [location, setLocation] = useState<Location | null>(null);
  const [address, setAddress] = useState<Address | null>(null);
  const [temperature, setTemperature] = useState<string>('Loading...');
  const [weatherDesc, setWeatherDesc] = useState<string>('Loading...');
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

  const fetchWeather = async (lat: number, lon: number) => {
    try {
      const response = await fetch(`https://wttr.in/${lat},${lon}?format=j1`);
      const data = await response.json();
      const tempC = parseFloat(data.current_condition[0].temp_C);
      const tempF = ((tempC * 9) / 5 + 32).toFixed(1);
      const desc = data.current_condition[0].weatherDesc[0].value;

      const finalWeather = `${tempF}°F`;

      setTemperature(finalWeather);
      setWeatherDesc(desc);

      // Send data back to parent
      onTemperatureChange?.(finalWeather);
      onWeatherChange?.(desc);
    } catch (err) {
      log('Weather fetch error', err);
      setTemperature('N/A');
      setWeatherDesc('Weather unavailable');
    }
  };

  const fetchAddress = async (lat: number, lon: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'TimesheetApp/1.0 (myemail@gmail.com)',
            'Accept-Language': 'en',
          },
        }
      );

      const data = await response.json();

      const addr: Address = {
        street:
          data.address?.road ||
          data.address?.pedestrian ||
          data.address?.neighbourhood ||
          'No street data',
        city:
          data.address?.city ||
          data.address?.town ||
          data.address?.village ||
          'No city data',
        state: data.address?.state || 'No state data',
        postalCode: data.address?.postcode || 'N/A',
        country: data.address?.country || 'No country data',
      };

      setAddress(addr);

      // Send formatted address to parent
      const formatted = `${addr.street}, ${addr.city}, ${addr.state}, ${addr.postalCode}, ${addr.country}`;
      onLocationChange?.(formatted);
    } catch (err) {
      log('Reverse geocode error', err);
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

        fetchWeather(latitude, longitude);
        fetchAddress(latitude, longitude);

        setLoading(false);
      },
      (err) => {
        log('Location error', err);
        setWeatherDesc('Location unavailable');
        setTemperature('');
        setLoading(false);
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  };

  useEffect(() => {
    fetchLocation();
  }, []);

  return (
    <View>
      <Text style={styles.label}>Location:</Text>
      {address ? (
        <Text style={styles.value}>
          {address.street}, {address.city}, {address.state}, {address.postalCode},{' '}
          {address.country}
        </Text>
      ) : (
        <Text style={styles.value}>Fetching address...</Text>
      )}

      <Text style={styles.label}>Temperature:</Text>
      <Text style={styles.value}>{temperature}</Text>

      <Text style={styles.label}>Weather:</Text>
      <Text style={styles.value}>{weatherDesc}</Text>

      {loading && <ActivityIndicator size="large" style={{ marginTop: 20 }} />}
    </View>
  );
};

const styles = StyleSheet.create({
  label: { 
    fontWeight: 'normal', // normal weight for headings
    fontSize: 14, 
    color: '#555',        // lighter color for labels
    marginTop: 8 
  },
  value: { 
    fontWeight: 'bold',   // bold for actual data
    fontSize: 14, 
    color: '#000',        // dark color for data
    marginBottom: 4 
  },
});

export default WeatherLocationCard;
