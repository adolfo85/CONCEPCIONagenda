import { useQuery, useMutation, useQueryClient, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
    getPatients,
    getDentists,
    getAppointments,
    getServiceTypes,
    createPatient,
    updatePatient,
    deletePatient,
    createDentist,
    updateDentist,
    deleteDentist,
    createAppointment,
    deleteAppointment,
    addServiceType
} from './storage';
import { Patient, Dentist, Appointment, ServiceType } from '../types';

// Create a client with optimized settings
export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 5, // Data stays fresh for 5 minutes
            gcTime: 1000 * 60 * 30, // Keep unused data in cache for 30 minutes (formerly cacheTime)
            refetchOnWindowFocus: false, // Don't refetch on window focus
            retry: 1, // Only retry once on failure
        },
    },
});

// Query Keys
export const queryKeys = {
    patients: ['patients'] as const,
    dentists: ['dentists'] as const,
    appointments: ['appointments'] as const,
    serviceTypes: ['serviceTypes'] as const,
};

// ============ PATIENTS HOOKS ============

export function usePatients() {
    return useQuery({
        queryKey: queryKeys.patients,
        queryFn: getPatients,
    });
}

export function usePatient(id: string) {
    const { data: patients, ...rest } = usePatients();
    return {
        ...rest,
        data: patients?.find(p => p.id === id),
    };
}

export function useCreatePatient() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: createPatient,
        onSuccess: (_, newPatient) => {
            // Optimistically add to cache
            queryClient.setQueryData<Patient[]>(queryKeys.patients, (old) => {
                return old ? [...old, newPatient] : [newPatient];
            });
        },
    });
}

export function useUpdatePatient() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: updatePatient,
        onSuccess: (_, updatedPatient) => {
            // Update cache optimistically
            queryClient.setQueryData<Patient[]>(queryKeys.patients, (old) => {
                return old?.map(p => p.id === updatedPatient.id ? updatedPatient : p) || [];
            });
        },
    });
}

export function useDeletePatient() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: deletePatient,
        onSuccess: (_, deletedId) => {
            // Remove from cache
            queryClient.setQueryData<Patient[]>(queryKeys.patients, (old) => {
                return old?.filter(p => p.id !== deletedId) || [];
            });
        },
    });
}

// ============ DENTISTS HOOKS ============

export function useDentists() {
    return useQuery({
        queryKey: queryKeys.dentists,
        queryFn: getDentists,
    });
}

export function useDentist(id: string) {
    const { data: dentists, ...rest } = useDentists();
    return {
        ...rest,
        data: dentists?.find(d => d.id === id),
    };
}

export function useCreateDentist() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: createDentist,
        onSuccess: (_, newDentist) => {
            queryClient.setQueryData<Dentist[]>(queryKeys.dentists, (old) => {
                return old ? [...old, newDentist] : [newDentist];
            });
        },
    });
}

export function useUpdateDentist() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: updateDentist,
        onSuccess: (_, updatedDentist) => {
            queryClient.setQueryData<Dentist[]>(queryKeys.dentists, (old) => {
                return old?.map(d => d.id === updatedDentist.id ? updatedDentist : d) || [];
            });
        },
    });
}

export function useDeleteDentist() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: deleteDentist,
        onSuccess: (_, deletedId) => {
            queryClient.setQueryData<Dentist[]>(queryKeys.dentists, (old) => {
                return old?.filter(d => d.id !== deletedId) || [];
            });
        },
    });
}

// ============ APPOINTMENTS HOOKS ============

export function useAppointments() {
    return useQuery({
        queryKey: queryKeys.appointments,
        queryFn: getAppointments,
    });
}

export function useCreateAppointment() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: createAppointment,
        onSuccess: (_, newAppointment) => {
            queryClient.setQueryData<Appointment[]>(queryKeys.appointments, (old) => {
                return old ? [...old, newAppointment] : [newAppointment];
            });
        },
    });
}

export function useDeleteAppointment() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: deleteAppointment,
        onSuccess: (_, deletedId) => {
            queryClient.setQueryData<Appointment[]>(queryKeys.appointments, (old) => {
                return old?.filter(a => a.id !== deletedId) || [];
            });
        },
    });
}

// ============ SERVICE TYPES HOOKS ============

export function useServiceTypes() {
    return useQuery({
        queryKey: queryKeys.serviceTypes,
        queryFn: getServiceTypes,
    });
}

export function useAddServiceType() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: addServiceType,
        onSuccess: (_, newType) => {
            queryClient.setQueryData<ServiceType[]>(queryKeys.serviceTypes, (old) => {
                return old ? [...old, newType as ServiceType] : [newType as ServiceType];
            });
        },
    });
}
