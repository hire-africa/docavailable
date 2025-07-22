# Doc Available - Healthcare Appointment Booking App

A comprehensive healthcare appointment booking application with real-time chat functionality, built with React Native and Laravel.

## 🏥 Features

### Core Functionality
- **Appointment Booking**: Schedule appointments with healthcare providers
- **Real-time Chat**: Secure messaging between patients and doctors
- **User Authentication**: Role-based access (Patients, Doctors, Admins)
- **Profile Management**: Complete user and doctor profile management
- **Payment Integration**: Secure payment processing for appointments
- **Push Notifications**: Real-time notifications for appointments and messages

### Security Features
- **End-to-End Encryption**: Secure message encryption
- **JWT Authentication**: Secure token-based authentication
- **Role-based Access Control**: Different permissions for different user types
- **Data Validation**: Comprehensive input validation and sanitization

## 🛠 Tech Stack

### Frontend (React Native)
- **React Native**: Cross-platform mobile development
- **Expo**: Development platform and tools
- **TypeScript**: Type-safe JavaScript
- **React Navigation**: Navigation between screens
- **AsyncStorage**: Local data persistence
- **Axios**: HTTP client for API calls

### Backend (Laravel)
- **Laravel 10**: PHP framework
- **MySQL**: Database
- **Laravel Sanctum**: API authentication
- **Laravel Broadcasting**: Real-time features
- **Laravel Notifications**: Push notifications
- **Laravel Jobs**: Background task processing

### Additional Technologies
- **WebSocket**: Real-time communication
- **Firebase Cloud Messaging**: Push notifications
- **Laravel Echo**: Real-time event broadcasting

## 📱 Screenshots

*Screenshots will be added here*

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- PHP (v8.1 or higher)
- Composer
- MySQL
- Expo CLI
- Android Studio / Xcode (for mobile development)

### Installation

#### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/doc-available.git
cd doc-available
```

#### 2. Backend Setup (Laravel)
```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan db:seed
php artisan serve
```

#### 3. Frontend Setup (React Native)
```bash
cd ../
npm install
npx expo start
```

#### 4. Environment Configuration
Create a `.env` file in the root directory:
```env
API_BASE_URL=http://localhost:8000/api
EXPO_PUBLIC_API_URL=http://localhost:8000/api
```

## 📁 Project Structure

```
Doc_available/
├── app/                    # React Native app screens
├── backend/               # Laravel backend
│   ├── app/
│   │   ├── Http/Controllers/
│   │   ├── Models/
│   │   └── Services/
│   ├── database/
│   └── routes/
├── components/            # Reusable React Native components
├── services/             # API services and utilities
├── scripts/              # Utility scripts
└── assets/               # Images, fonts, and other assets
```

## 🔧 Configuration

### Database Configuration
Update the database settings in `backend/.env`:
```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=doc_available
DB_USERNAME=your_username
DB_PASSWORD=your_password
```

### Push Notifications
Configure Firebase Cloud Messaging in `backend/config/broadcasting.php`:
```php
'fcm' => [
    'driver' => 'fcm',
    'key' => env('FCM_SERVER_KEY'),
],
```

## 🧪 Testing

### Backend Tests
```bash
cd backend
php artisan test
```

### Frontend Tests
```bash
npm test
```

## 📦 Deployment

### Backend Deployment
1. Set up a production server
2. Configure environment variables
3. Run database migrations
4. Set up SSL certificates
5. Configure web server (Apache/Nginx)

### Mobile App Deployment
1. Build the app using Expo:
   ```bash
   eas build --platform all
   ```
2. Submit to app stores (iOS App Store, Google Play Store)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

If you encounter any issues or have questions:
- Create an issue on GitHub
- Check the documentation in the `/docs` folder
- Review the troubleshooting guide

## 🔄 Changelog

See [CHANGELOG.md](CHANGELOG.md) for a list of changes and updates.

## 👥 Authors

- **Your Name** - *Initial work* - [YourGitHub](https://github.com/yourusername)

## 🙏 Acknowledgments

- Laravel team for the amazing framework
- React Native community for mobile development tools
- All contributors and testers

---

**Note**: This is a healthcare application. Please ensure compliance with relevant healthcare regulations (HIPAA, GDPR, etc.) before deploying to production.
