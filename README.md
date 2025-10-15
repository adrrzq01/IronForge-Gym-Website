# IronForge Gym - Membership & Employee Management System

A comprehensive full-stack web application for managing gym memberships, employees, and operations. Built with React, Node.js, Express, and SQLite.

## 🚀 Features

### 🔐 Authentication & Roles
- **Admin Login**: Full system access and management
- **Employee Login**: Member data access and attendance tracking
- **Member Login**: Personal profile and attendance viewing
- **Role-based dashboards** with appropriate permissions

### 👥 Member Management
- **Complete member registration** with photo capture
- **Member details**: Name, age, gender, email, phone, address
- **Emergency contact** information
- **Plan assignment** (Monthly, Quarterly, Yearly)
- **Payment status** tracking and due dates
- **Photo storage** in database
- **Edit, update, or remove** members
- **Attendance tracking** with daily check-in/out

### 👨‍🏫 Employee Management
- **Add/edit/remove employees** (trainers, receptionists, etc.)
- **Trainer assignment** to members
- **Salary and shift** tracking
- **Performance monitoring**

### 📅 Plan & Services Management
- **Membership plans** with pricing and duration
- **Extra services**: Personal training, diet consultation, yoga, Zumba, etc.
- **Service assignment** to members
- **Plan statistics** and analytics

### 📊 Dashboards & Reports
- **Admin Dashboard**: Total members, active plans, pending payments, employee count
- **Employee Dashboard**: Assigned members, today's check-ins, tasks
- **Member Dashboard**: Profile, plan expiry, attendance record, payment history
- **Export reports** (CSV/PDF for attendance, payments, member list)

### 💳 Payment Integration
- **Stripe/Razorpay** integration for online payments
- **Offline payment** tracking (cash, UPI, card)
- **Receipt generation**
- **Payment history** and analytics

### 📸 Camera Integration
- **Photo capture** during member registration
- **Attendance verification** using camera photos
- **Face verification** (optional)

### 🌙 UI/UX Features
- **Dark/Light mode** toggle
- **Search & filter** for members/employees
- **Pagination** for large lists
- **Notifications/reminders** (payment due, plan expiry)
- **Responsive design** for all devices

## 🛠️ Tech Stack

### Frontend
- **React 18** - Modern UI library
- **Tailwind CSS** - Utility-first CSS framework
- **React Router** - Client-side routing
- **Axios** - HTTP client
- **React Hot Toast** - Notifications
- **Lucide React** - Icons
- **Recharts** - Charts and analytics

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **SQLite** - Lightweight database
- **JWT** - Authentication tokens
- **bcryptjs** - Password hashing
- **Multer** - File upload handling
- **Express Validator** - Input validation

## 📦 Installation

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ironforge-gym
   ```

2. **Install dependencies**
   ```bash
   # Install root dependencies
   npm install
   
   # Install server dependencies
   cd server
   npm install
   
   # Install client dependencies
   cd ../client
   npm install
   ```

3. **Environment Setup**
   ```bash
   # Create .env file in server directory
   cd server
   cp .env.example .env
   ```
   
   Update the `.env` file with your configuration:
   ```
   PORT=5000
   JWT_SECRET=your_jwt_secret_key
   NODE_ENV=development
   STRIPE_SECRET_KEY=your_stripe_secret_key
   RAZORPAY_KEY_ID=your_razorpay_key_id
   RAZORPAY_KEY_SECRET=your_razorpay_key_secret
   ```

4. **Initialize Database**
   ```bash
   cd server
   node database/init.js
   ```

5. **Start the application**
   ```bash
   # From root directory
   npm run dev
   ```

   This will start both the backend server (port 5000) and frontend development server (port 3000).

## 🎯 Default Credentials

The system comes with pre-configured demo accounts:

- **Admin**: `admin@ironforge.com` / `password123`
- **Employee**: `employee@ironforge.com` / `password123`
- **Member**: `member@ironforge.com` / `password123`

## 📁 Project Structure

```
ironforge-gym/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── contexts/       # React contexts
│   │   ├── pages/          # Page components
│   │   └── ...
│   └── package.json
├── server/                 # Node.js backend
│   ├── controllers/        # Route controllers
│   ├── middleware/         # Custom middleware
│   ├── routes/            # API routes
│   ├── database/          # Database schema and init
│   ├── uploads/            # File uploads
│   └── package.json
└── package.json           # Root package.json
```

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update profile
- `PUT /api/auth/change-password` - Change password

### Members
- `GET /api/members` - Get all members
- `POST /api/members` - Create member
- `GET /api/members/:id` - Get member by ID
- `PUT /api/members/:id` - Update member
- `DELETE /api/members/:id` - Delete member
- `POST /api/members/:id/photo` - Upload member photo

### Attendance
- `POST /api/attendance/checkin` - Check in member
- `POST /api/attendance/checkout` - Check out member
- `GET /api/attendance/today` - Get today's attendance
- `GET /api/attendance/range` - Get attendance by date range

### Payments
- `GET /api/payments` - Get all payments
- `POST /api/payments` - Create payment
- `POST /api/payments/process` - Process payment
- `GET /api/payments/overdue` - Get overdue payments

### Dashboard
- `GET /api/dashboard/admin` - Admin dashboard data
- `GET /api/dashboard/employee` - Employee dashboard data
- `GET /api/dashboard/member` - Member dashboard data

## 🚀 Deployment

### Production Build
```bash
# Build frontend
cd client
npm run build

# Start production server
cd ../server
npm start
```

### Environment Variables for Production
Make sure to set the following environment variables:
- `NODE_ENV=production`
- `JWT_SECRET` - Strong secret key
- `STRIPE_SECRET_KEY` - Your Stripe secret key
- `RAZORPAY_KEY_ID` - Your Razorpay key ID
- `RAZORPAY_KEY_SECRET` - Your Razorpay key secret

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support, email support@ironforge.com or create an issue in the repository.

## 🎉 Acknowledgments

- Built with modern web technologies
- Inspired by popular gym management systems like Cult.Fit and Gold's Gym
- Uses best practices for security and performance
