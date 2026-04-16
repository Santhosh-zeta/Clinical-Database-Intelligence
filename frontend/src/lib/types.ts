export type RiskLevel = 'Low' | 'Medium' | 'High' | 'Critical';

export interface Patient {
  id: string;
  name: string;
  age: number;
  gender: string;
  ward: string;
  bed: string;
  admissionDate: string;
  diagnosis: string;
  riskScore: RiskLevel;
  avatarUrl?: string;
}

export interface Vitals {
  patientId: string;
  timestamp: string;
  heartRate: number;
  bloodPressure: {
    systolic: number;
    diastolic: number;
  };
  oxygenLevel: number;
  temperature: number;
  // Backend snake_case fields
  recorded_at?: string;
  heart_rate?: number;
  systolic_bp?: number;
  diastolic_bp?: number;
  spo2?: number;
}

export interface Alert {
  id: string;
  patientId: string;
  patientName: string;
  timestamp: string;
  type: 'Critical' | 'Warning' | 'Info';
  message: string;
  metric: string;
  resolved: boolean;
  escalationLevel?: number;
  alertType?: string;
}
