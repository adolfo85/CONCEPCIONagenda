// Specialty Types
export type SpecialtyType = 'orthodontics' | 'general';

export type ServiceType = string;



export type ToothSurface = 'Ocl' | 'V' | 'L' | 'P';

export interface ToothDetail {
  number: string;
  surfaces: ToothSurface[];
}

export interface ClinicalRecord {
  id: string;
  date: string;
  recordType?: 'control' | 'consultation'; // undefined = 'control' for backward compatibility

  // Orthodontics fields
  upperArch?: string;
  lowerArch?: string;
  upperMonths?: number;
  lowerMonths?: number;
  monthsActive?: number; // Kept for backward compatibility

  // General dentistry fields
  serviceType?: ServiceType;
  toothNumbers?: string[]; // Array of tooth numbers (Legacy or simple usage)
  toothSurfaces?: ToothSurface[]; // For restorations (Legacy)
  toothDetails?: ToothDetail[]; // New field for detailed per-tooth surface info

  notes: string;

  paymentAmount: number; // Represents Control Payment or general payment
  installationPayment?: number; // Represents Installation Payment (orthodontics only)
  debitAmount?: number; // Internal expense/debit for this record (affects earnings, not patient balance)
  usdRate?: number; // USD Blue exchange rate at the time of payment
  isInstallation?: boolean; // Deprecated in favor of installationPayment value
}

export interface Dentist {
  id: string;
  name: string;
  specialty?: SpecialtyType; // Optional for backward compatibility, defaults to 'orthodontics'
}

export interface Patient {
  id: string;
  dentistId: string;
  name: string;
  phone: string;
  email?: string;
  startDate: string;
  installationTotal?: number; // Total cost of installation (orthodontics only)
  installationDebit?: number; // Debit/discount on installation (affects earnings, not patient balance)
  records: ClinicalRecord[];
}

export interface Appointment {
  id: string;
  dentistId: string;
  patientId: string;
  patientName: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  duration: number; // minutes
}

export type ArchWireType =
  | "0.12 acero"
  | "0.12 niti"
  | "0.14 niti"
  | "0.16 niti"
  | "0.18 niti"
  | "0.20 niti"
  | "0.20 acero"
  | "17x25 niti"
  | "19x25 niti"
  | "19x25 acero"
  | "arco braided"
  | "Otro";