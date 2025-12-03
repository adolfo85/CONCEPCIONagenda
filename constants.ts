
import { ArchWireType, ServiceType, ToothSurface } from './types';

export const ARCH_WIRES: ArchWireType[] = [
  "0.12 acero",
  "0.12 niti",
  "0.14 niti",
  "0.16 niti",
  "0.18 niti",
  "0.20 niti",
  "0.20 acero",
  "17x25 niti",
  "19x25 niti",
  "19x25 acero",
  "arco braided"
];

export const DEFAULT_SERVICE_TYPES: ServiceType[] = [
  'Consulta',
  'Restauración simple',
  'Restauración compuesta',
  'Extracción',
  'Sesión de tratamiento de conducto',
  'Implante'
];

export const TOOTH_SURFACES: ToothSurface[] = ['Ocl', 'V', 'L', 'P'];

// Dental tooth numbering (FDI notation)
export const TOOTH_NUMBERS: string[] = [
  '11', '12', '13', '14', '15', '16', '17',
  '21', '22', '23', '24', '25', '26', '27',
  '31', '32', '33', '34', '35', '36', '37',
  '41', '42', '43', '44', '45', '46', '47'
];

export const INITIAL_PATIENTS_KEY = 'orto-track-patients-v1';
export const DENTISTS_KEY = 'orto-track-dentists-v1';
export const SERVICE_TYPES_KEY = 'orto-track-service-types-v1';
