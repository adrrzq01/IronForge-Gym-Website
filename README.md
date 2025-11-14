# IronForge Gym Management System

A comprehensive, full-stack web application designed to manage all aspects of a gym's operations. It features role-based access control for admins, employees, and members, a secure payment system, and a complete class scheduling and booking module.

---

## Key Features

The application's functionality is tailored to three distinct roles: Admin, Member, and Employee.

### Admin
- **Comprehensive Dashboard:** Provides an at-a-glance overview of the entire gym's operations. It features real-time statistical cards for Total Members, Active Members, Monthly Revenue, and Pending Payments. Interactive charts visualize historical attendance and revenue trends, allowing admins to track growth and performance over time.

- **Advanced Member Management:** A complete interface to manage the entire member lifecycle. Admins can add new members with detailed profiles (including live photo capture via webcam), edit existing information, view a member's complete payment and attendance history in a dedicated detail view, and manage their active status within the gym.

- **Full Employee Management:** Enables full CRUD (Create, Read, Update, Delete) operations for staff. Admins can manage employee profiles, including their role, shift times, and salary details, ensuring all staff information is up-to-date.

- **Dynamic Plan & Service Management:** Allows admins to dynamically define the gym's offerings. They can create, update, and delete various membership plans with different durations and prices. They can also manage add-on services like 'Personal Training' or 'Yoga Classes' that can be scheduled by members.

- **Class Scheduling & Management:** A powerful tool for admins to create and manage the gym's class schedule. They can schedule new classes, assign them to specific trainers, set the class capacity, and define the start and end times.

- **Financial Reporting & Payments:** Admins can view a complete, searchable history of all payments made through the system. They also have the ability to manually record offline payments (e.g., cash, check) to keep financial records accurate. The reporting module allows for the generation and export of CSV reports for both member data and payment histories.

### Member
- **Personalized Dashboard:** A personalized portal for each member to track their fitness journey. It prominently displays their current membership plan, payment status, and upcoming due dates. It also includes statistics on their total gym visits and a list of any additional services they have subscribed to.

- **Secure Plan Purchasing:** Members can browse all available membership plans and securely purchase or upgrade their plan online. The entire payment process is handled through Razorpay, ensuring secure and reliable transactions.

- **Interactive Class Booking:** An intuitive module where members can view a schedule of all available classes. They can see details like the trainer, class time, and current capacity. Members can book a spot with a single click and also cancel their existing bookings from their dashboard, with real-time updates to the class capacity.

- **Centralized Notifications:** A notification center in the header keeps members informed of important events. They receive alerts for upcoming payment dues, successful bookings, and other system-wide announcements, ensuring they never miss an update.

### Employee
- **Role-Focused Dashboard:** A streamlined dashboard that presents employees with the information most relevant to their daily tasks. This includes statistics on the number of members they are assigned to (if they are a trainer) and the total number of member check-ins for the day.

- **Member & Attendance Viewing:** Employees have read-only access to the list of all gym members and can view the daily attendance log. This allows them to track who is currently in the gym and assist members as needed.

### Core System Features
- **Secure Authentication:** A robust and secure user registration and login system built with JWT (JSON Web Tokens). Passwords are never stored in plain text; they are always hashed using the industry-standard bcrypt algorithm.

- **Token-Based Password Reset:** A full-featured and secure password reset system. Users who forget their password can request a reset link to be sent to their email. The link contains a unique, time-sensitive token for enhanced security, allowing them to set a new password.

- **Strict Role-Based Access Control (RBAC):** The application enforces a strict separation of concerns through a powerful role-based access control system. Every API endpoint is protected by middleware that verifies the user's role (Admin, Employee, or Member), ensuring that users can only access the data and perform the actions permitted for their specific role.

- **Persistent Dark/Light Theme:** A modern, user-toggleable dark and light mode is available throughout the application to enhance user comfort and accessibility. The user's preference is saved in their browser's local storage for a persistent experience across sessions.

---

## Tech Stack

### Frontend
- **Framework:** React.js
- **Routing:** React Router
- **Styling:** Tailwind CSS
- **HTTP Client:** Axios
- **State Management:** React Context API
- **Icons:** Lucide React
- **Charts:** Recharts
- **Notifications:** React Hot Toast

### Backend
- **Framework:** Node.js with Express.js
- **Database:** SQLite
- **Authentication:** JSON Web Tokens (JWT) & bcrypt.js
- **Payment Gateway:** Razorpay
- **File Uploads:** Multer

### Database
- **Engine:** SQLite 3

---

## API Endpoints

### Auth (`/api/auth`)
| Method | Endpoint                 | Description                                      |
|--------|--------------------------|--------------------------------------------------|
| POST   | `/register`              | Register a new user.                             |
| POST   | `/login`                 | Log in an existing user.                         |
| GET    | `/profile`               | Get the current user's profile.                  |
| PUT    | `/profile`               | Update the current user's profile.               |
| PUT    | `/change-password`       | Change the current user's password.              |
| POST   | `/forgot-password`       | Initiate the password reset process.             |
| POST   | `/reset-password/:token` | Complete the password reset process.             |

### Members (`/api/members`)
| Method | Endpoint       | Description                                      |
|--------|----------------|--------------------------------------------------|
| GET    | `/`            | Get a paginated list of all members.             |
| POST   | `/`            | Create a new member.                             |
| GET    | `/:id`         | Get details for a specific member.               |
| PUT    | `/:id`         | Update a specific member's details.              |
| POST   | `/:id/photo`   | Upload a photo for a member.                     |

### Schedule (`/api/schedule`)
| Method | Endpoint               | Description                                      |
|--------|------------------------|--------------------------------------------------|
| GET    | `/`                    | Get all upcoming class schedules.                |
| POST   | `/`                    | Create a new class schedule (Admin only).        |
| POST   | `/book`                | Book the current member into a class.            |
| GET    | `/my-bookings`         | Get all bookings for the current member.         |
| DELETE | `/bookings/:booking_id`| Cancel a specific booking.                       |

### Payments (`/api/payments`)
| Method | Endpoint         | Description                                      |
|--------|------------------|--------------------------------------------------|
| POST   | `/create-order`  | Create a Razorpay order for a plan purchase.     |
| POST   | `/verify-payment`| Verify a Razorpay payment and update the plan.   |
| GET    | `/`              | Get a list of all payments (Admin).              |
| POST   | `/`              | Manually record a payment (Admin).               |

---

## Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites
- Node.js (v14 or higher)
- npm

### Installation

1. **Clone the repository**
   ```sh
   git clone https://github.com/your_username/ironforge-gym.git
   ```
2. **Install root dependencies**
   ```sh
   npm install
   ```
3. **Install server dependencies**
   ```sh
   cd server
   npm install
   ```
4. **Install client dependencies**
   ```sh
   cd ../client
   npm install
   ```

### Database Setup
The SQLite database will be automatically initialized when the server starts for the first time, based on the schema defined in `server/database/schema.sql`.

### Running the Application

From the root directory, you can run both the client and server concurrently:

```sh
npm run dev
```

This will start the React development server on `http://localhost:3000` and the Node.js backend server on `http://localhost:5000`.

## Environment Variables

For full functionality, you will need to create a `.env` file in the `server` directory with the following variables:

```
# A secret key for signing JWT tokens
JWT_SECRET=your_jwt_secret_key

# Your Razorpay API keys
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
```