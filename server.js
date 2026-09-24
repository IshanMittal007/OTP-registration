require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');

const app = express();

connectDB();

// Body parser
app.use(express.json());
app.use(cookieParser());

// Serve static frontend files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

// Authentication API routes
app.use('/api/auth', authRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});