import AsyncStorage from '@react-native-async-storage/async-storage';

const SAVED_TIMESHEETS_KEY = 'saved_timesheets';
const SUBMITTED_DATES_KEY = 'submitted_dates';

export type LocalTimesheetPayload = {
  id: string; // A unique local ID, e.g., a timestamp
  originalTimesheetId: string; // The ID from the server
  date: string; // The date of the timesheet
  job_name: string;
  data: any; // The payload shape you PUT to the backend
};

/**
 * Saves or updates a timesheet draft in local storage.
 */
export const saveTimesheetLocally = async (payload: LocalTimesheetPayload): Promise<void> => {
  const allTimesheets = await getLocalTimesheets();
  const index = allTimesheets.findIndex(t => t.id === payload.id);
  
  if (index !== -1) {
    allTimesheets[index] = payload; // Update existing
  } else {
    allTimesheets.push(payload); // Add new
  }
  
  await AsyncStorage.setItem(SAVED_TIMESHEETS_KEY, JSON.stringify(allTimesheets));
};

/**
 * Retrieves all locally saved timesheet drafts.
 */
export const getLocalTimesheets = async (): Promise<LocalTimesheetPayload[]> => {
  const jsonValue = await AsyncStorage.getItem(SAVED_TIMESHEETS_KEY);
  return jsonValue ? JSON.parse(jsonValue) : [];
};

/**
 * Retrieves a single locally saved timesheet by its local ID.
 */
export const getLocalTimesheetById = async (localId: string): Promise<LocalTimesheetPayload | null> => {
    const timesheets = await getLocalTimesheets();
    return timesheets.find(ts => ts.id === localId) || null;
};

/**
 * Deletes a timesheet draft from local storage after submission.
 */
export const deleteLocalTimesheet = async (localId: string): Promise<void> => {
  let timesheets = await getLocalTimesheets();
  timesheets = timesheets.filter(ts => ts.id !== localId);
  await AsyncStorage.setItem(SAVED_TIMESHEETS_KEY, JSON.stringify(timesheets));
};

// --- Date Submission Tracking ---

const toDateOnlyString = (date: string) => new Date(date).toISOString().split('T')[0];

/**
 * Adds a date to the list of submitted dates to prevent re-submission.
 */
export const addSubmittedDate = async (date: string): Promise<void> => {
  const submittedDates = await getSubmittedDates();
  const dateOnly = toDateOnlyString(date);
  if (!submittedDates.includes(dateOnly)) {
    submittedDates.push(dateOnly);
    await AsyncStorage.setItem(SUBMITTED_DATES_KEY, JSON.stringify(submittedDates));
  }
};

/**
 * Retrieves all dates that have been marked as submitted.
 */
export const getSubmittedDates = async (): Promise<string[]> => {
  const jsonValue = await AsyncStorage.getItem(SUBMITTED_DATES_KEY);
  return jsonValue ? JSON.parse(jsonValue) : [];
};

/**
 * Checks if a timesheet for a specific date has already been submitted.
 */
export const isDateSubmitted = async (date: string): Promise<boolean> => {
  const submittedDates = await getSubmittedDates();
  return submittedDates.includes(toDateOnlyString(date));
};
