# DocAvailable Admin Dashboard

A comprehensive admin dashboard for the DocAvailable telemedicine application, built with Next.js 14, TypeScript, and Tailwind CSS.

## Features

### 🏠 Dashboard
- Real-time statistics and metrics
- User growth charts
- Revenue analytics
- Subscription distribution
- Recent activity feed

### 👥 User Management
- View all users (doctors, patients, admins)
- Search and filter users
- Update user status (approve, reject, suspend)
- Delete users
- View user details and ratings

### 💳 Subscription Management
- Monitor active subscriptions
- View subscription details and remaining sessions
- Toggle subscription status
- Track subscription performance

### 📋 Plan Management
- Create, edit, and delete subscription plans
- Configure plan features and pricing
- Set session limits (text, voice, video)
- Manage plan status

### 📅 Appointment Management
- View all appointments
- Filter by status and type
- Update appointment status
- Track appointment completion rates

### 💰 Payment Monitoring
- View all payment transactions
- Filter by status and payment gateway
- Update payment status
- View detailed payment information

### 📊 Analytics
- User growth trends
- Revenue analytics
- Appointment statistics
- Payment method distribution
- Platform health metrics

### ⚙️ Settings
- Application configuration
- Database settings
- Email configuration
- Payment gateway settings
- AI/OpenAI configuration

## Technology Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Icons**: Lucide React
- **Database**: PostgreSQL (production DocAvailable database)
- **Authentication**: JWT
- **Notifications**: React Hot Toast

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Access to the DocAvailable production database

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd docavailable-admin
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.local.example .env.local
```

4. Update `.env.local` with your configuration:
```env
# Database Configuration - Using production DocAvailable database
DATABASE_URL=postgresql://doc_available_user:password@host:port/doc_available?sslmode=require

# JWT Secret for admin authentication
JWT_SECRET=your-admin-jwt-secret-here

# Admin credentials (change these!)
ADMIN_EMAIL=admin@docavailable.com
ADMIN_PASSWORD=admin123

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Default Login Credentials

- **Email**: admin@docavailable.com
- **Password**: admin123

⚠️ **Important**: Change these credentials in production!

## Database Connection

The admin dashboard connects directly to the production DocAvailable PostgreSQL database. The connection is configured using the `DATABASE_URL` environment variable.

### Database Tables Used

- `users` - User accounts and profiles
- `subscriptions` - User subscription data
- `plans` - Subscription plans
- `appointments` - Appointment bookings
- `payment_transactions` - Payment records
- `reviews` - User reviews and ratings

## API Endpoints

### Authentication
- `POST /api/auth/login` - Admin login

### Dashboard
- `GET /api/dashboard/stats` - Dashboard statistics

### Users
- `GET /api/users` - List users with pagination and filters
- `PATCH /api/users/[id]/status` - Update user status
- `DELETE /api/users/[id]` - Delete user

### Subscriptions
- `GET /api/subscriptions` - List subscriptions
- `PATCH /api/subscriptions/[id]/toggle` - Toggle subscription status

### Plans
- `GET /api/plans` - List plans
- `POST /api/plans` - Create plan
- `PUT /api/plans/[id]` - Update plan
- `DELETE /api/plans/[id]` - Delete plan

### Appointments
- `GET /api/appointments` - List appointments
- `PATCH /api/appointments/[id]/status` - Update appointment status

### Payments
- `GET /api/payments` - List payments
- `PATCH /api/payments/[id]/status` - Update payment status

### Analytics
- `GET /api/analytics` - Get analytics data

### Settings
- `GET /api/settings` - Get settings
- `PUT /api/settings` - Update settings

## Security Features

- JWT-based authentication
- Protected API routes
- Input validation and sanitization
- SQL injection prevention
- CORS configuration

## Deployment

### Build for Production

```bash
npm run build
```

### Start Production Server

```bash
npm start
```

### Environment Variables for Production

Ensure all environment variables are properly set in your production environment:

- `DATABASE_URL` - Production database connection string
- `JWT_SECRET` - Strong JWT secret key
- `ADMIN_EMAIL` - Admin login email
- `ADMIN_PASSWORD` - Strong admin password
- `NEXT_PUBLIC_APP_URL` - Public URL of the application

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is proprietary software for DocAvailable.

## Support

For support and questions, please contact the development team.






