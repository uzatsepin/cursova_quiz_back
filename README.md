# Quiz Application Backend

This is the backend for a quiz application that provides API endpoints for user authentication, course management, and test taking.

## Setup

1. Create a `.env` file in the root directory with the following content:
```
PORT=3000
```

2. Install dependencies:
```bash
npm install
```

3. Initialize the database:
- Run the SQL commands from `database.sql` in your PostgreSQL database

4. Start the server:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

## API Endpoints

### Authentication

#### Register
- **POST** `/api/register`
- Body: `{ "name": "string", "email": "string", "password": "string" }`

#### Login
- **POST** `/api/login`
- Body: `{ "email": "string", "password": "string" }`

### Courses

#### Get All Courses
- **GET** `/api/courses`
- Headers: `email`, `password`

### Tests

#### Get Course Tests
- **GET** `/api/courses/:courseId/tests`
- Headers: `email`, `password`

#### Submit Test Answer
- **POST** `/api/tests/:testId/submit`
- Headers: `email`, `password`
- Body: `{ "answer": number }`

### User Settings

#### Update Settings
- **PUT** `/api/settings`
- Headers: `email`, `password`
- Body: `{ "font_size": number, "theme": "light"|"dark", "language": "string" }`

### User Progress

#### Get Progress
- **GET** `/api/progress`
- Headers: `email`, `password`

## Database Schema

### Users Table
- id (SERIAL PRIMARY KEY)
- name (VARCHAR)
- email (VARCHAR, UNIQUE)
- password (VARCHAR)
- course (INTEGER)
- score (INTEGER)
- finished_courses (INTEGER[])

### Courses Table
- id (SERIAL PRIMARY KEY)
- title (VARCHAR)
- description (TEXT)
- order_number (INTEGER)
- created_at (TIMESTAMP)

### Tests Table
- id (SERIAL PRIMARY KEY)
- course_id (INTEGER, FOREIGN KEY)
- question (TEXT)
- options (JSON)
- correct_answer (INTEGER)
- points (INTEGER)
- created_at (TIMESTAMP)

### User Settings Table
- id (SERIAL PRIMARY KEY)
- user_id (INTEGER, FOREIGN KEY)
- font_size (INTEGER)
- theme (VARCHAR)
- language (VARCHAR)
- created_at (TIMESTAMP)

## Features

1. Basic Authentication (email/password)
2. Course Management
3. Test Taking with Automatic Scoring
4. User Progress Tracking
5. Customizable User Interface Settings
   - Font Size
   - Theme (light/dark)
   - Language Preference 