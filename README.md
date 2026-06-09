# Job Portal Backend

## 1. Overview
This repository contains the backend service for a role-based Job Portal platform. It exposes REST APIs for authentication, seeker workflows, and administrative operations.

## 2. Technology Stack
- Node.js
- Express.js
- MongoDB with Mongoose
- JWT authentication
- Bcrypt password hashing
- Cloudinary (media storage)

## 3. Core Modules
- `auth`: registration, login, current user session
- `seeker`: profile and application operations
- `admin`: dashboard analytics, user control, job moderation, employer verification

## 4. Setup and Execution
1. Install dependencies:
```bash
npm install
```
2. Configure environment variables in `.env`:
```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```
3. (Optional) seed default admin user:
```bash
node seeders/adminSeeder.js
```
4. Run development server:
```bash
npm run dev
```

Default local API base URL: `http://localhost:5000/api`

## 5. API Scope (Summary)
- Public routes:
- `POST /api/auth/register`
- `POST /api/auth/login`
- Protected routes:
- `GET /api/auth/me`
- `/api/seeker/*`
- `/api/admin/*` (admin role required)

## 6. Project Structure (Summary)
```text
config/        # Database and cloud configuration
controllers/   # Request handling logic
middleware/    # Authentication, RBAC, upload handlers
models/        # Mongoose schemas
routes/        # API route declarations
seeders/       # Initial data scripts
```

## 7. Security Notes
- Passwords are hashed using bcrypt.
- Authentication uses JWT tokens.
- Admin endpoints are protected through role-based authorization middleware.

## 8. Academic Note
This backend is implemented as the service layer of a modular full-stack system, emphasizing separation of concerns, RBAC enforcement, and maintainable REST design.
