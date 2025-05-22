-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(100) NOT NULL,
    course INTEGER DEFAULT 1,
    score INTEGER DEFAULT 0,
    finished_courses INTEGER[] DEFAULT '{}'
);

-- Courses table
CREATE TABLE courses (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    order_number INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tests table
CREATE TABLE tests (
    id SERIAL PRIMARY KEY,
    course_id INTEGER REFERENCES courses(id),
    question TEXT NOT NULL,
    options JSON NOT NULL, -- Array of possible answers
    correct_answer INTEGER NOT NULL, -- Index of correct answer in options array
    points INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User settings table for UI customization
CREATE TABLE user_settings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    font_size INTEGER DEFAULT 16,
    theme VARCHAR(20) DEFAULT 'light',
    language VARCHAR(10) DEFAULT 'uk',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
); 