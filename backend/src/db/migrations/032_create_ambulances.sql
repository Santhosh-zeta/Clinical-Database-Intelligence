CREATE TABLE IF NOT EXISTS ambulances (
    id VARCHAR(50) PRIMARY KEY,
    status VARCHAR(50) NOT NULL,
    eta VARCHAR(50),
    dist VARCHAR(50),
    patient VARCHAR(100),
    speed VARCHAR(50),
    lat DECIMAL(10, 8) NOT NULL,
    lng DECIMAL(11, 8) NOT NULL,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    org_id INTEGER REFERENCES organizations(id)
);

INSERT INTO ambulances (id, status, eta, dist, patient, speed, lat, lng, org_id)
VALUES
('AMB-101', 'Inbound', '4 mins', '1.2 km', 'Critical - Trauma', '65 km/h', 12.9816, 77.5846, 1),
('AMB-102', 'Dispatched', '12 mins', '5.8 km', 'Cardiac Arrest', '80 km/h', 12.9616, 77.6046, 1),
('AMB-104', 'Available', '--', '--', '--', '0 km/h', 12.9916, 77.6146, 1),
('AMB-107', 'Returning', '18 mins', '7.4 km', '--', '55 km/h', 12.9516, 77.5746, 1)
ON CONFLICT (id) DO NOTHING;
