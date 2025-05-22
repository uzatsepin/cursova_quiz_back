const express = require('express');
const { PrismaClient } = require('@prisma/client');
const cors = require('cors');

const prisma = new PrismaClient();
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Authentication middleware
const authenticateUser = async (req, res, next) => {
    const { email, password } = req.headers;
    if (!email || !password) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        const user = await prisma.user.findUnique({
            where: { email },
            include: { settings: true }
        });

        if (!user || user.password !== password) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        req.user = user;
        next();
    } catch (err) {
        console.error('Auth error:', err);
        res.status(500).json({ error: 'Server error' });
    }
};

// Auth routes
app.post('/api/register', async (req, res) => {
    const { name, email, password } = req.body;
    
    try {
        const user = await prisma.user.create({
            data: {
                name,
                email,
                password,
                settings: {
                    create: {} // This will create settings with default values
                }
            },
            include: {
                settings: true
            }
        });
        
        res.json(user);
    } catch (err) {
        console.error('Registration error:', err);
        if (err.code === 'P2002') {
            res.status(400).json({ error: 'Email already exists' });
        } else {
            res.status(500).json({ error: 'Server error' });
        }
    }
});

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    
    // Validate input
    if (!email || !password) {
        return res.status(400).json({ 
            error: 'Email and password are required',
            details: {
                email: !email ? 'Email is required' : null,
                password: !password ? 'Password is required' : null
            }
        });
    }

    try {
        // Find user by email
        const user = await prisma.user.findFirst({
            where: {
                email: email.toString().toLowerCase()
            },
            include: {
                settings: true
            }
        });

        // Check if user exists and password matches
        if (!user || user.password !== password) {
            return res.status(401).json({ 
                error: 'Invalid email or password'
            });
        }

        // Return user data without password
        const { password: _, ...userData } = user;
        res.json(userData);
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ 
            error: 'Server error',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

// Courses routes
app.get('/api/courses', authenticateUser, async (req, res) => {
    try {
        const courses = await prisma.course.findMany({
            orderBy: { orderNumber: 'asc' },
            include: {
                tests: {
                    select: {
                        id: true,
                        question: true,
                        options: true,
                        points: true
                    }
                }
            }
        });
        res.json(courses);
    } catch (err) {
        console.error('Get courses error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Create new course
app.post('/api/courses', authenticateUser, async (req, res) => {
    const { title, description, orderNumber } = req.body;

    // Validate required fields
    if (!title || !orderNumber) {
        return res.status(400).json({ error: 'Title and order number are required' });
    }

    try {
        // Check if course with this order number already exists
        const existingCourse = await prisma.course.findFirst({
            where: { orderNumber }
        });

        if (existingCourse) {
            return res.status(400).json({ error: 'Course with this order number already exists' });
        }

        const course = await prisma.course.create({
            data: {
                title,
                description,
                orderNumber
            }
        });

        res.status(201).json(course);
    } catch (err) {
        console.error('Create course error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Tests routes
app.get('/api/courses/:courseId/tests', authenticateUser, async (req, res) => {
    try {
        const tests = await prisma.test.findMany({
            where: { courseId: parseInt(req.params.courseId) },
            select: {
                id: true,
                question: true,
                options: true,
                points: true
            }
        });
        res.json(tests);
    } catch (err) {
        console.error('Get tests error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Create new test for a course
app.post('/api/courses/:courseId/tests', authenticateUser, async (req, res) => {
    const courseId = parseInt(req.params.courseId);
    const { question, options, correctAnswer, points = 1 } = req.body;

    // Validate required fields
    if (!question || !options || correctAnswer === undefined) {
        return res.status(400).json({ 
            error: 'Question, options array, and correctAnswer are required',
            example: {
                question: "What is JavaScript?",
                options: ["Programming language", "Database", "Operating System"],
                correctAnswer: 0, // Index of correct answer in options array
                points: 1 // Optional, defaults to 1
            }
        });
    }

    // Validate options and correctAnswer
    if (!Array.isArray(options) || options.length < 2) {
        return res.status(400).json({ error: 'Options must be an array with at least 2 choices' });
    }

    if (correctAnswer < 0 || correctAnswer >= options.length) {
        return res.status(400).json({ error: 'correctAnswer must be a valid index in options array' });
    }

    try {
        // Check if course exists
        const course = await prisma.course.findUnique({
            where: { id: courseId }
        });

        if (!course) {
            return res.status(404).json({ error: 'Course not found' });
        }

        const test = await prisma.test.create({
            data: {
                courseId,
                question,
                options: options, // Prisma will automatically serialize this to JSON
                correctAnswer,
                points: points
            }
        });

        res.status(201).json(test);
    } catch (err) {
        console.error('Create test error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Submit test answer
app.post('/api/tests/:testId/submit', authenticateUser, async (req, res) => {
    const { answer } = req.body;
    const testId = parseInt(req.params.testId);
    
    try {
        const test = await prisma.test.findUnique({
            where: { id: testId },
            include: { course: true }
        });

        if (!test) {
            return res.status(404).json({ error: 'Тест не знайдено' });
        }

        const isCorrect = answer === test.correctAnswer;
        const points = isCorrect ? test.points : 0;

        // Record the attempt
        const attempt = await prisma.testAttempt.create({
            data: {
                userId: req.user.id,
                testId,
                answer,
                isCorrect,
                points
            }
        });

        let courseCompleted = false;

        if (isCorrect) {
            // Update user score
            await prisma.user.update({
                where: { id: req.user.id },
                data: { score: { increment: points } }
            });

            // Check if all tests in the course are completed
            const allCourseTests = await prisma.test.findMany({
                where: { courseId: test.courseId }
            });

            const userCompletedTests = await prisma.testAttempt.findMany({
                where: {
                    userId: req.user.id,
                    isCorrect: true,
                    test: {
                        courseId: test.courseId
                    }
                }
            });

            // If user completed all tests in the course
            if (userCompletedTests.length === allCourseTests.length) {
                await prisma.user.update({
                    where: { id: req.user.id },
                    data: {
                        finishedCourses: {
                            push: test.courseId
                        }
                    }
                });
                courseCompleted = true;
            }
        }

        res.json({ 
            correct: isCorrect, 
            points,
            courseCompleted
        });
    } catch (err) {
        console.error('Submit test error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// User settings routes
app.put('/api/settings', authenticateUser, async (req, res) => {
    const { fontSize, theme, language } = req.body;
    
    try {
        const settings = await prisma.userSettings.update({
            where: { userId: req.user.id },
            data: { fontSize, theme, language }
        });
        res.json(settings);
    } catch (err) {
        console.error('Update settings error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get user progress
app.get('/api/progress', authenticateUser, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: {
                course: true,
                score: true,
                finishedCourses: true
            }
        });
        res.json(user);
    } catch (err) {
        console.error('Get progress error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get user's test attempts
app.get('/api/user/attempts', authenticateUser, async (req, res) => {
    try {
        const attempts = await prisma.testAttempt.findMany({
            where: { userId: req.user.id },
            include: {
                test: {
                    include: {
                        course: {
                            select: {
                                title: true,
                                orderNumber: true
                            }
                        }
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        // Transform the data to be more frontend-friendly
        const formattedAttempts = attempts.map(attempt => ({
            id: attempt.id,
            testId: attempt.testId,
            question: attempt.test.question,
            yourAnswer: attempt.answer,
            correctAnswer: attempt.test.correctAnswer,
            isCorrect: attempt.isCorrect,
            points: attempt.points,
            course: {
                title: attempt.test.course.title,
                orderNumber: attempt.test.course.orderNumber
            },
            attemptedAt: attempt.createdAt
        }));

        res.json({
            total: attempts.length,
            correctAnswers: attempts.filter(a => a.isCorrect).length,
            totalPoints: attempts.reduce((sum, a) => sum + a.points, 0),
            attempts: formattedAttempts
        });
    } catch (err) {
        console.error('Get attempts error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get users rating
app.get('/api/rating', authenticateUser, async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                score: true,
                finishedCourses: true,
                attempts: {
                    select: {
                        isCorrect: true
                    }
                }
            },
            orderBy: [
                { score: 'desc' },
                { name: 'asc' }
            ]
        });

        const rating = users.map((user, index) => ({
            position: index + 1,
            id: user.id,
            name: user.name,
            score: user.score,
            completedCourses: user.finishedCourses.length,
            statistics: {
                totalAttempts: user.attempts.length,
                correctAnswers: user.attempts.filter(a => a.isCorrect).length,
                accuracy: user.attempts.length > 0 
                    ? Math.round((user.attempts.filter(a => a.isCorrect).length / user.attempts.length) * 100)
                    : 0
            },
            isCurrentUser: user.id === req.user.id
        }));

        // Get current user position and nearby users
        const currentUserIndex = rating.findIndex(u => u.id === req.user.id);
        const windowSize = 5; // How many users to show before and after current user

        let ratingWindow = {
            top: rating.slice(0, 3), // Always show top 3
            nearby: rating.slice(
                Math.max(3, currentUserIndex - windowSize),
                Math.min(rating.length, currentUserIndex + windowSize + 1)
            ),
            currentUserPosition: currentUserIndex + 1,
            totalUsers: rating.length
        };

        res.json(ratingWindow);
    } catch (err) {
        console.error('Get rating error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something broke!' });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received. Closing Prisma Client.');
    await prisma.$disconnect();
    process.exit(0);
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
}); 