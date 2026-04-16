import { Patient, Vitals, Alert, RiskLevel } from './types';

export const mockPatients: Patient[] = [
  {
    id: 'P-001',
    name: 'Eleanor Vance',
    age: 68,
    gender: 'Female',
    ward: 'ICU-A',
    bed: 'Bed 01',
    admissionDate: '2026-03-29',
    diagnosis: 'Acute Myocardial Infarction',
    riskScore: 'Critical',
    avatarUrl: 'https://i.pravatar.cc/150?u=P-001',
  },
  {
    id: 'P-002',
    name: 'James Crain',
    age: 45,
    gender: 'Male',
    ward: 'General Ward 3',
    bed: 'Bed 12',
    admissionDate: '2026-03-30',
    diagnosis: 'Pneumonia',
    riskScore: 'Medium',
    avatarUrl: 'https://i.pravatar.cc/150?u=P-002',
  },
  {
    id: 'P-003',
    name: 'Sarah Connor',
    age: 34,
    gender: 'Female',
    ward: 'General Ward 2',
    bed: 'Bed 05',
    admissionDate: '2026-03-31',
    diagnosis: 'Post-op Observation',
    riskScore: 'Low',
    avatarUrl: 'https://i.pravatar.cc/150?u=P-003',
  },
  {
    id: 'P-004',
    name: 'Robert Ford',
    age: 72,
    gender: 'Male',
    ward: 'ICU-B',
    bed: 'Bed 02',
    admissionDate: '2026-03-28',
    diagnosis: 'Sepsis',
    riskScore: 'High',
    avatarUrl: 'https://i.pravatar.cc/150?u=P-004',
  },
  {
    id: 'P-005',
    name: 'Michael Scott',
    age: 51,
    gender: 'Male',
    ward: 'Cardiology',
    bed: 'Bed 14',
    admissionDate: '2026-03-30',
    diagnosis: 'Arrhythmia',
    riskScore: 'Medium',
    avatarUrl: 'https://i.pravatar.cc/150?u=P-005',
  },
];

const randomInRange = (min: number, max: number) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

export const generateInitialVitals = (patients: Patient[]): Vitals[] => {
  return patients.map((patient) => {
    let hr = 75;
    let sys = 120;
    let dia = 80;
    let spo2 = 98;
    let temp = 37.0;

    switch (patient.riskScore) {
      case 'Critical':
        hr = randomInRange(110, 135);
        sys = randomInRange(150, 180);
        dia = randomInRange(95, 110);
        spo2 = randomInRange(85, 92);
        temp = 38.5;
        break;
      case 'High':
        hr = randomInRange(100, 115);
        sys = randomInRange(140, 155);
        dia = randomInRange(90, 100);
        spo2 = randomInRange(92, 95);
        temp = 38.0;
        break;
      case 'Medium':
        hr = randomInRange(80, 95);
        sys = randomInRange(125, 140);
        dia = randomInRange(80, 90);
        spo2 = randomInRange(95, 97);
        temp = 37.5;
        break;
      case 'Low':
      default:
        hr = randomInRange(60, 80);
        sys = randomInRange(110, 125);
        dia = randomInRange(70, 80);
        spo2 = randomInRange(97, 100);
        temp = 37.0;
        break;
    }

    return {
      patientId: patient.id,
      timestamp: new Date().toISOString(),
      heartRate: hr,
      bloodPressure: { systolic: sys, diastolic: dia },
      oxygenLevel: spo2,
      temperature: temp,
    };
  });
};

export const generateHistoricalVitals = (patient: Patient, points = 10): Vitals[] => {
  const history: Vitals[] = [];
  let baseHr = patient.riskScore === 'Critical' ? 120 : patient.riskScore === 'High' ? 105 : 75;
  let baseSpo2 = patient.riskScore === 'Critical' ? 90 : patient.riskScore === 'High' ? 94 : 98;

  const now = new Date();

  for (let i = points; i >= 0; i--) {
     const time = new Date(now.getTime() - i * 60000);
     history.push({
       patientId: patient.id,
       timestamp: time.toISOString(),
       heartRate: baseHr + randomInRange(-5, 5),
       bloodPressure: { systolic: 120 + randomInRange(-10, 10), diastolic: 80 + randomInRange(-5, 5) },
       oxygenLevel: Math.min(100, baseSpo2 + randomInRange(-2, 2)),
       temperature: 37.0 + (randomInRange(-5, 5) / 10),
     });
  }
  return history;
}

export const generateNextVitals = (lastVitals: Vitals, riskScore: RiskLevel): Vitals => {
  return {
    patientId: lastVitals.patientId,
    timestamp: new Date().toISOString(),
    heartRate: Math.max(40, Math.min(180, lastVitals.heartRate + randomInRange(-3, 3))),
    bloodPressure: {
      systolic: Math.max(80, Math.min(200, lastVitals.bloodPressure.systolic + randomInRange(-2, 2))),
      diastolic: Math.max(50, Math.min(120, lastVitals.bloodPressure.diastolic + randomInRange(-2, 2)))
    },
    oxygenLevel: Math.max(70, Math.min(100, lastVitals.oxygenLevel + randomInRange(-1, 1))),
    temperature: parseFloat((lastVitals.temperature + randomInRange(-1, 1) / 10).toFixed(1)),
  };
};

export const evaluateAlerts = (vitals: Vitals, patient: Patient): Alert | null => {
  let type: 'Critical' | 'Warning' | 'Info' = 'Info';
  let issue = '';
  let metric: Alert['metric'] = 'Multiple';

  if (vitals.heartRate > 120 || vitals.heartRate < 50) {
    type = 'Critical';
    issue = `Abnormal HR: ${vitals.heartRate} bpm.`;
    metric = 'Heart Rate';
  } else if (vitals.oxygenLevel < 92) {
    type = 'Critical';
    issue = `Low SpO2: ${vitals.oxygenLevel}%.`;
    metric = 'Oxygen Level';
  } else if (vitals.bloodPressure.systolic > 160 || vitals.bloodPressure.systolic < 90) {
    type = 'Warning';
    issue = `Abnormal BP: ${vitals.bloodPressure.systolic}/${vitals.bloodPressure.diastolic} mmHg.`;
    metric = 'Blood Pressure';
  } else if (vitals.heartRate > 100) {
    type = 'Warning';
    issue = `Elevated HR: ${vitals.heartRate} bpm.`;
    metric = 'Heart Rate';
  } else {
      return null;
  }

  return {
    id: `alt-${Date.now()}-${patient.id}`,
    patientId: patient.id,
    patientName: patient.name,
    timestamp: vitals.timestamp,
    type,
    message: issue,
    metric,
    resolved: false
  };
};
