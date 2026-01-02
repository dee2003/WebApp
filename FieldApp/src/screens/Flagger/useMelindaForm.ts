import { useState } from 'react';
import { Alert } from 'react-native';
import apiClient from '../../api/apiClient';

export const useMelindaForm = () => {
  const [date] = useState(new Date().toISOString().split('T')[0]);
  const [foremanName] = useState("Melinda");
  const [crewMembers, setCrewMembers] = useState([{ name: '', hours: '' }]);
  const [notes, setNotes] = useState('');

  const addRow = () => setCrewMembers([...crewMembers, { name: '', hours: '' }]);

  const updateMember = (index: number, field: string, value: string) => {
    const updated = [...crewMembers];
    updated[index] = { ...updated[index], [field]: value };
    setCrewMembers(updated);
  };

  const handleSave = async () => {
    const fileName = `${foremanName}_${date.replace(/-/g, '')}`;
    try {
      await apiClient.post('/api/timesheets/melinda', {
        timesheet_name: fileName,
        data: { crewMembers, notes, foremanName, date },
        status: 'SUBMITTED'
      });
      Alert.alert('Success', `Timesheet ${fileName} saved.`);
    } catch (error) {
      Alert.alert('Error', 'Failed to save timesheet.');
    }
  };

  return { date, foremanName, crewMembers, notes, addRow, updateMember, setNotes, handleSave };
};