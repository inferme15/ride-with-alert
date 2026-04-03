-- Insert sample data for the fleet tracking system

-- Insert manager (admin user)
INSERT INTO managers (username, password) 
VALUES ('admin', 'pass1234') 
ON CONFLICT (username) DO NOTHING;

-- Insert sample drivers
INSERT INTO drivers (driver_number, name, phone_number, license_number, blood_group, medical_conditions, emergency_contact, emergency_contact_phone) 
VALUES
('DRV001', 'Ravi Kumar', '9342746662', 'TN09DL1234', 'O+', 'None', 'Sita Kumar', '9342746662'),
('DRV002', 'Arjun Singh', '9342746662', 'KA05DL5678', 'A+', 'Diabetes', 'Meera Singh', '9342746662'),
('DRV003', 'Mohammed Ali', '9342746662', 'MH12DL9988', 'B+', 'None', 'Ayesha Ali', '9342746662'),
('DRV004', 'Suresh Patel', '9342746662', 'GJ01DL4455', 'AB+', 'Hypertension', 'Kiran Patel', '9342746662')
ON CONFLICT (driver_number) DO NOTHING;

-- Insert sample vehicles
INSERT INTO vehicles (vehicle_number, vehicle_type, fuel_capacity, current_fuel, owner_name, owner_phone) 
VALUES
('TN09AB1234', 'Car', 45, 85, 'Ravi Kumar', '9342746662'),
('KA05CD5678', 'Truck', 200, 70, 'Arjun Singh', '9342746662'),
('MH12EF9988', 'Bus', 150, 90, 'Mohammed Ali', '9342746662'),
('GJ01GH4455', 'Van', 60, 65, 'Suresh Patel', '9342746662')
ON CONFLICT (vehicle_number) DO NOTHING;

-- Verify data was inserted
SELECT 'MANAGERS' as table_name, COUNT(*) as count FROM managers
UNION ALL
SELECT 'DRIVERS' as table_name, COUNT(*) as count FROM drivers
UNION ALL
SELECT 'VEHICLES' as table_name, COUNT(*) as count FROM vehicles;