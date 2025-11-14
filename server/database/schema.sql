-- IronForge Gym Database Schema

-- Users table (for authentication)
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(10) NOT NULL CHECK (role IN ('admin', 'employee', 'member')) DEFAULT 'member',
    two_factor_secret TEXT,
    two_factor_enabled BOOLEAN DEFAULT 0,
    is_active BOOLEAN DEFAULT 1,
    password_reset_token TEXT,
    password_reset_expires DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Members table
CREATE TABLE IF NOT EXISTS members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    name VARCHAR(100) NOT NULL,
    age INTEGER NOT NULL,
    gender VARCHAR(10) NOT NULL CHECK (gender IN ('male', 'female', 'other')),
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(20) NOT NULL,
    address TEXT NOT NULL,
    emergency_contact_name VARCHAR(100),
    emergency_contact_phone VARCHAR(20),
    aadhaar VARCHAR(12),
    pan VARCHAR(10),
    driving_license VARCHAR(50),
    passport VARCHAR(15),
    is_student BOOLEAN DEFAULT 0,
    photo_path VARCHAR(255),
    plan_id INTEGER,
    payment_status VARCHAR(10) DEFAULT 'pending' CHECK (payment_status IN ('paid', 'pending', 'overdue')),
    payment_due_date DATE,
    join_date DATE DEFAULT CURRENT_DATE,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (plan_id) REFERENCES plans(id)
);

-- Employees table
CREATE TABLE IF NOT EXISTS employees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(20) NOT NULL,
    position VARCHAR(50) NOT NULL,
    salary DECIMAL(10,2),
    shift_start TIME,
    shift_end TIME,
    hire_date DATE DEFAULT CURRENT_DATE,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Plans table
CREATE TABLE IF NOT EXISTS plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL,
    duration_months INTEGER NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    description TEXT,
    services_included TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Services table
CREATE TABLE IF NOT EXISTS services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    duration_minutes INTEGER,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Member Services (many-to-many relationship)
CREATE TABLE IF NOT EXISTS member_services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER NOT NULL,
    service_id INTEGER NOT NULL,
    assigned_date DATE DEFAULT CURRENT_DATE,
    expiry_date DATE,
    is_active BOOLEAN DEFAULT 1,
    FOREIGN KEY (member_id) REFERENCES members(id),
    FOREIGN KEY (service_id) REFERENCES services(id)
);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_type VARCHAR(10) NOT NULL CHECK (payment_type IN ('online', 'cash', 'upi', 'card')),
    payment_method VARCHAR(50),
    transaction_id VARCHAR(100),
    status VARCHAR(10) DEFAULT 'pending' CHECK (status IN ('success', 'pending', 'failed')),
    payment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    due_date DATE,
    description TEXT,
    receipt_path VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (member_id) REFERENCES members(id)
);

-- Attendance table
CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER NOT NULL,
    check_in_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    check_out_time DATETIME,
    photo_path VARCHAR(255),
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (member_id) REFERENCES members(id)
);

-- Member Trainer Assignment
CREATE TABLE IF NOT EXISTS member_trainers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER NOT NULL,
    trainer_id INTEGER NOT NULL,
    assigned_date DATE DEFAULT CURRENT_DATE,
    is_active BOOLEAN DEFAULT 1,
    FOREIGN KEY (member_id) REFERENCES members(id),
    FOREIGN KEY (trainer_id) REFERENCES employees(id)
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(20) DEFAULT 'general' CHECK (type IN ('payment_due', 'plan_expiry', 'general')),
    is_read BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Insert default plans
-- Default sample plans (customize prices/descriptions as needed)
INSERT OR IGNORE INTO plans (name, duration_months, price, description, services_included) VALUES 
('Access Monthly', 1, 1500.00, 'Monthly access to gym facilities and locker', 'Gym access, Locker, Basic equipment'),
('Access Quarterly', 3, 4200.00, 'Three-month access with a small discount', 'Gym access, Locker, Basic equipment'),
('Access Annual', 12, 15000.00, 'Annual access with priority scheduling for classes', 'Gym access, Locker, Basic equipment');

-- Insert default services
INSERT OR IGNORE INTO services (name, description, price, duration_minutes) VALUES 
('Personal Training (1-on-1)', 'One-on-one personal training session', 600.00, 60),
('Diet Consultation', 'Nutritional guidance and meal planning', 350.00, 45),
('Yoga Classes', 'Group yoga sessions', 200.00, 60),
('Zumba Classes', 'High-energy dance fitness class', 250.00, 45),
('Martial Arts Classes', 'Group martial arts training (karate/kickboxing/taekwondo style sessions)', 300.00, 60);

-- Class Schedules table
CREATE TABLE IF NOT EXISTS class_schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    service_id INTEGER NOT NULL,
    trainer_id INTEGER,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    capacity INTEGER NOT NULL,
    booked_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (service_id) REFERENCES services(id),
    FOREIGN KEY (trainer_id) REFERENCES employees(id)
);

-- Bookings table (for member class/service reservations)
CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER NOT NULL,
    schedule_id INTEGER NOT NULL,
    booking_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (member_id) REFERENCES members(id),
    FOREIGN KEY (schedule_id) REFERENCES class_schedules(id),
    UNIQUE(member_id, schedule_id)
);

