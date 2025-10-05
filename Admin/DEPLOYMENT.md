# Admin Dashboard Deployment Guide

This is the admin dashboard for the DocAvailable application, built with Next.js.

## Digital Ocean App Platform Deployment

### Prerequisites
- Digital Ocean account
- GitHub repository with this Admin folder
- Database connection details

### Deployment Steps

1. **Connect Repository**
   - Go to Digital Ocean App Platform
   - Create a new app
   - Connect your GitHub repository
   - Select the `Admin` folder as the source directory

2. **Configure Environment Variables**
   Set the following environment variables in Digital Ocean:
   ```
   DATABASE_URL=your-postgresql-connection-string
   JWT_SECRET=your-jwt-secret-key
   ADMIN_EMAIL=admin@yourdomain.com
   ADMIN_PASSWORD=your-secure-password
   NODE_ENV=production
   PORT=3000
   ```

3. **Build Settings**
   - Build Command: `npm run build`
   - Run Command: `npm start`
   - Output Directory: `.next`

4. **Deploy**
   - Click "Create Resources"
   - Wait for deployment to complete

### Troubleshooting

If you get a 404 error after deployment:

1. **Check Health Endpoint**: Visit `https://your-app-url.ondigitalocean.app/api/health`
   - Should return: `{"status":"ok","message":"Admin dashboard is running","timestamp":"..."}`

2. **Verify Environment Variables**: Ensure all required environment variables are set in Digital Ocean

3. **Check Build Logs**: Look for any errors in the Digital Ocean build logs

4. **Port Configuration**: The app should automatically bind to the PORT environment variable (default: 3000)

### Local Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy environment file:
   ```bash
   cp .env.example .env.local
   ```

3. Update `.env.local` with your configuration

4. Run development server:
   ```bash
   npm run dev
   ```

### Docker Deployment

If deploying with Docker:

1. Build the image:
   ```bash
   docker build -t docavailable-admin .
   ```

2. Run the container:
   ```bash
   docker run -p 3000:3000 --env-file .env docavailable-admin
   ```

### Admin Account Setup

After deployment, you can create an admin account by running:
```bash
npm run create-admin
```

Or use the environment variables ADMIN_EMAIL and ADMIN_PASSWORD to set up the initial admin account.
