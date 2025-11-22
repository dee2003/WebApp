import React from 'react';
import { View, Text } from 'react-native';
import type { RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { SupervisorStackParamList } from '../../navigation/AppNavigator';

type RouteP = RouteProp<SupervisorStackParamList, 'SupervisorTimesheetList'>;
type NavP = StackNavigationProp<SupervisorStackParamList, 'SupervisorTimesheetList'>;

export default function SupervisorTimesheetList({ route }: { route: RouteP; navigation: NavP }) {
  const { foremanId, date, foremanName } = route.params;
  return (
    <View>
      <Text>Timesheets for {foremanName} on {new Date(date).toLocaleDateString()}</Text>
      {/* render list here */}
    </View>
  );
}
