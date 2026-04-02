# Clinical Decision Support & Hospital Intelligence System

A full-stack, real-time hospital management and clinical intelligence dashboard. 
This system integrates a traditional relational database with a time-series database to track patient records, monitor vitals continuously, dynamically generate risk scores, and automate ICU escalation and alerts using PostgreSQL database triggers natively.

## Architecture

* **Database (`timescale/timescaledb:latest-pg16`)**: Runs in Docker. Stores relational hospital data and high-frequency time-series patient vitals. Implements native DB triggers for alert generation.
* **Backend (`backend/`)**: Node.js & Express REST API handling CRUD operations, exposing active patients, vitals, and generated alerts.
* **Frontend (`frontend/`)**: Next.js & React Dashboard displaying real-time interactive charts (Recharts), unacknowledged alerts, and active hospital metrics.
* **Simulator (`simulator/`)**: A continuous data generator that seeds the database and acts as medical hardware, posting live patient vitals every 5 seconds to test the intelligence engine.

---

## Prerequisites
* **Docker** & **Docker Compose**
* **Node.js** (v18+)

---

## How to Run the Complete Website

### 1. Start the Database (Docker)
Open a terminal in the root directory and start the TimescaleDB container:
```bash
# This will pull the timescale image and start the DB on localhost:5433
docker compose up -d
```
*(Note: If the `api` build hangs in docker compose, you can safely cancel and run the backend natively as the `.env` is configured for it).*

### 2. Setup & Run the Backend API
Open a new terminal and navigate to the `backend/` directory:
```bash
cd backend

# Install dependencies
npm install

# Run database migrations (creates all schemas, hypertables, and triggers)
# Make sure your Timescale container is fully running before executing this!
npm run migrate

# Start the Express server on http://localhost:3001
npm start
```

### 3. Start the Frontend Dashboard
Open another terminal and navigate to the `frontend/` directory:
```bash
cd frontend

# Install dependencies
npm install

# Start the Next.js development server on http://localhost:3000
npm run dev
```

### 4. Seed Data & Run the Simulator
To see the system actually "thinking", we need to generate live data. Open a final terminal in the `simulator/` directory:

```bash
cd simulator

# Install dependencies
npm install

# 1. Seed initial Doctors and Patients via the API
node seed.js
```

**Note on Wards & Admissions:**
You must initialize Wards and Beds directly into the database, and admit the seeded patients to trigger the vitals monitor.
Run the following SQL against your Database (`postgresql://postgres:postgres@localhost:5433/clinical_db`):
```sql
INSERT INTO wards (name, ward_type, total_beds) VALUES
  ('General Ward A','general',10), ('ICU','icu',5), ('Emergency','emergency',8);

INSERT INTO beds (bed_number, ward_id, is_icu) VALUES
  ('GEN-01',1,false),('GEN-02',1,false),('GEN-03',1,false),('GEN-04',1,false),('GEN-05',1,false),
  ('ICU-01',2,true),('ICU-02',2,true),('ICU-03',2,true),('ICU-04',2,true),('ICU-05',2,true);
```

**Admit a Patient (Example Request):**
```bash
curl -X POST http://localhost:3001/api/admissions \
  -H "Content-Type: application/json" \
  -d '{"patient_id": 1, "doctor_id": 1, "ward_id": 1, "bed_id": 1, "diagnosis": "Fever Observation"}'
```

**Start the Live Vitals Feed:**
Once admissions exist, start the continuous simulator:
```bash
node simulate.js
```
This script acts as the hospital hardware monitors. It will fetch all active patient admissions and begin POSTing random, fluctuating Heart Rate, SpO2, and BP vitals to the API every 3-5 seconds.

### 5. View the Dashboard
Navigate to [http://localhost:3000](http://localhost:3000) in your browser. 
You will see:
* The live **Patients Directory** with interactive spark-line charts pulling native TimescaleDB aggregated vitals from the backend.
* **Critical Alerts** dynamically flooding in real-time if the simulator triggers a "Critical Risk" patient profile (e.g., SpO2 drops below 90%). 

The UI actively polls the backend and rerenders automatically!