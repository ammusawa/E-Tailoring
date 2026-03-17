-- E-Tailoring Database Schema
-- Note: Database creation is handled by setup-db.js script
-- This schema assumes the database has already been selected

-- User Roles Enum (stored as VARCHAR in MySQL)
-- CUSTOMER, TAILOR, ADMIN

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(255) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  firstName VARCHAR(255) NOT NULL,
  lastName VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  address TEXT,
  role ENUM('CUSTOMER', 'TAILOR', 'ADMIN') DEFAULT 'CUSTOMER',
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_role (role)
);

-- Tailor Profiles Table
CREATE TABLE IF NOT EXISTS tailor_profiles (
  id VARCHAR(255) PRIMARY KEY,
  userId VARCHAR(255) UNIQUE NOT NULL,
  bio TEXT,
  experience INT,
  rating DECIMAL(3,2) DEFAULT 0.00,
  totalOrders INT DEFAULT 0,
  completedOrders INT DEFAULT 0,
  bankName VARCHAR(255),
  accountName VARCHAR(255),
  accountNumber VARCHAR(50),
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_userId (userId)
);

-- Styles Table
CREATE TABLE IF NOT EXISTS styles (
  id VARCHAR(255) PRIMARY KEY,
  tailorId VARCHAR(255),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100) NOT NULL,
  imageUrl LONGTEXT,
  basePrice DECIMAL(10,2) NOT NULL,
  isActive BOOLEAN DEFAULT TRUE,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (tailorId) REFERENCES users(id),
  INDEX idx_category (category),
  INDEX idx_isActive (isActive),
  INDEX idx_tailorId (tailorId)
);

-- Style Images Table (for multiple images per style)
CREATE TABLE IF NOT EXISTS style_images (
  id VARCHAR(255) PRIMARY KEY,
  styleId VARCHAR(255) NOT NULL,
  imageUrl LONGTEXT NOT NULL,
  displayOrder INT NOT NULL DEFAULT 0,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (styleId) REFERENCES styles(id) ON DELETE CASCADE,
  INDEX idx_styleId (styleId),
  INDEX idx_displayOrder (displayOrder)
);

-- Orders Table
CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR(255) PRIMARY KEY,
  customerId VARCHAR(255) NOT NULL,
  tailorId VARCHAR(255),
  styleId VARCHAR(255) NOT NULL,
  status ENUM('PENDING', 'CONFIRMED', 'IN_PROGRESS', 'READY_FOR_FITTING', 'REVISION', 'COMPLETED', 'COLLECTED', 'CANCELLED') DEFAULT 'PENDING',
  paymentStatus ENUM('PENDING', 'PAID', 'FAILED', 'REFUNDED') DEFAULT 'PENDING',
  quantity INT DEFAULT 1,
  totalAmount DECIMAL(10,2) NOT NULL,
  paidAmount DECIMAL(10,2) DEFAULT 0.00,
  deliveryAddress TEXT NOT NULL,
  deliveryDate DATETIME,
  specialInstructions TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (customerId) REFERENCES users(id),
  FOREIGN KEY (tailorId) REFERENCES users(id),
  FOREIGN KEY (styleId) REFERENCES styles(id),
  INDEX idx_customerId (customerId),
  INDEX idx_tailorId (tailorId),
  INDEX idx_status (status),
  INDEX idx_paymentStatus (paymentStatus)
);

-- Measurements Table
CREATE TABLE IF NOT EXISTS measurements (
  id VARCHAR(255) PRIMARY KEY,
  orderId VARCHAR(255) UNIQUE NOT NULL,
  chest DECIMAL(5,2),
  waist DECIMAL(5,2),
  hips DECIMAL(5,2),
  shoulder DECIMAL(5,2),
  sleeveLength DECIMAL(5,2),
  shirtLength DECIMAL(5,2),
  trouserLength DECIMAL(5,2),
  inseam DECIMAL(5,2),
  outseam DECIMAL(5,2),
  neck DECIMAL(5,2),
  notes TEXT,
  verified BOOLEAN DEFAULT FALSE,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (orderId) REFERENCES orders(id) ON DELETE CASCADE
);

-- Order Status History Table
CREATE TABLE IF NOT EXISTS order_status_history (
  id VARCHAR(255) PRIMARY KEY,
  orderId VARCHAR(255) NOT NULL,
  status ENUM('PENDING', 'CONFIRMED', 'IN_PROGRESS', 'READY_FOR_FITTING', 'REVISION', 'COMPLETED', 'COLLECTED', 'CANCELLED') NOT NULL,
  notes TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (orderId) REFERENCES orders(id) ON DELETE CASCADE,
  INDEX idx_orderId (orderId),
  INDEX idx_createdAt (createdAt)
);

-- Payments Table
CREATE TABLE IF NOT EXISTS payments (
  id VARCHAR(255) PRIMARY KEY,
  orderId VARCHAR(255) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'NGN',
  status ENUM('PENDING', 'PENDING_CONFIRMATION', 'PAID', 'FAILED', 'REFUNDED', 'REJECTED') DEFAULT 'PENDING',
  paystackReference VARCHAR(255) UNIQUE,
  paystackResponse TEXT,
  receipt LONGTEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (orderId) REFERENCES orders(id),
  INDEX idx_orderId (orderId),
  INDEX idx_paystackReference (paystackReference),
  INDEX idx_status (status)
);

-- Messages Table
CREATE TABLE IF NOT EXISTS messages (
  id VARCHAR(255) PRIMARY KEY,
  orderId VARCHAR(255) NOT NULL,
  senderId VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  isRead BOOLEAN DEFAULT FALSE,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (orderId) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (senderId) REFERENCES users(id),
  INDEX idx_orderId (orderId),
  INDEX idx_senderId (senderId),
  INDEX idx_createdAt (createdAt)
);

-- Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(255) PRIMARY KEY,
  userId VARCHAR(255) NOT NULL,
  orderId VARCHAR(255),
  type ENUM('MESSAGE', 'ORDER_CONFIRMED', 'ORDER_STATUS_UPDATED', 'PAYMENT_CONFIRMED', 'PAYMENT_SUBMITTED', 'ORDER_ASSIGNED') NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  isRead BOOLEAN DEFAULT FALSE,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (orderId) REFERENCES orders(id) ON DELETE CASCADE,
  INDEX idx_userId (userId),
  INDEX idx_orderId (orderId),
  INDEX idx_isRead (isRead),
  INDEX idx_createdAt (createdAt)
);

