import { Patient, Dentist, ServiceType, Appointment } from '../types';
import { DEFAULT_SERVICE_TYPES } from '../constants';

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3000/api' : '/api');

// --- Dentists ---

export const getDentists = async (): Promise<Dentist[]> => {
  try {
    const response = await fetch(`${API_URL}/dentists`);
    if (!response.ok) throw new Error('Failed to fetch dentists');
    return await response.json();
  } catch (error) {
    console.error("Error fetching dentists:", error);
    return [];
  }
};

export const createDentist = async (dentist: Dentist): Promise<void> => {
  try {
    await fetch(`${API_URL}/dentists`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dentist)
    });
  } catch (error) {
    console.error("Error creating dentist:", error);
  }
};

export const updateDentist = async (dentist: Dentist): Promise<void> => {
  try {
    await fetch(`${API_URL}/dentists/${dentist.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dentist)
    });
  } catch (error) {
    console.error("Error updating dentist:", error);
  }
};

export const deleteDentist = async (id: string): Promise<void> => {
  try {
    await fetch(`${API_URL}/dentists/${id}`, {
      method: 'DELETE'
    });
  } catch (error) {
    console.error("Error deleting dentist:", error);
  }
};

// --- Patients ---

export const getPatients = async (): Promise<Patient[]> => {
  try {
    const response = await fetch(`${API_URL}/patients`);
    if (!response.ok) throw new Error('Failed to fetch patients');
    return await response.json();
  } catch (error) {
    console.error("Error fetching patients:", error);
    return [];
  }
};

export const createPatient = async (patient: Patient): Promise<void> => {
  try {
    const response = await fetch(`${API_URL}/patients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patient)
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create patient');
    }
  } catch (error) {
    console.error("Error creating patient:", error);
    throw error; // Re-throw to let React Query handle it
  }
};

export const updatePatient = async (patient: Patient): Promise<void> => {
  try {
    const response = await fetch(`${API_URL}/patients/${patient.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patient)
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to update patient');
    }
  } catch (error) {
    console.error("Error updating patient:", error);
    throw error;
  }
};

export const deletePatient = async (id: string): Promise<void> => {
  try {
    await fetch(`${API_URL}/patients/${id}`, {
      method: 'DELETE'
    });
  } catch (error) {
    console.error("Error deleting patient:", error);
  }
};

// --- Appointments ---

export const getAppointments = async (): Promise<Appointment[]> => {
  try {
    const response = await fetch(`${API_URL}/appointments`);
    if (!response.ok) throw new Error('Failed to fetch appointments');
    return await response.json();
  } catch (error) {
    console.error("Error fetching appointments:", error);
    return [];
  }
};

export const createAppointment = async (appointment: Appointment): Promise<void> => {
  try {
    await fetch(`${API_URL}/appointments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(appointment)
    });
  } catch (error) {
    console.error("Error creating appointment:", error);
  }
};

export const deleteAppointment = async (id: string): Promise<void> => {
  try {
    await fetch(`${API_URL}/appointments/${id}`, {
      method: 'DELETE'
    });
  } catch (error) {
    console.error("Error deleting appointment:", error);
  }
};

// --- Service Types ---

export const getServiceTypes = async (): Promise<ServiceType[]> => {
  try {
    const response = await fetch(`${API_URL}/service-types`);
    if (!response.ok) return DEFAULT_SERVICE_TYPES;
    return await response.json();
  } catch (error) {
    console.error("Error fetching service types:", error);
    return DEFAULT_SERVICE_TYPES;
  }
};

export const addServiceType = async (name: string): Promise<void> => {
  try {
    await fetch(`${API_URL}/service-types`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
  } catch (error) {
    console.error("Error adding service type:", error);
  }
};

// Helper
export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 9);
};
