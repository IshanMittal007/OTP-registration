const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Otp = require('../models/Otp');
const sendEmail = require('../utils/sendEmail');

// Token generation
const generateAccessToken = (user) => {
    return jwt.sign(
        { userId: user._id, email: user.email },
        process.env.ACCESS_TOKEN_SECRET,
        { experiesIN: '15m'}
    );
};

const generateRefreshToken = (user) => {
    return jwt.sign(
        { userId: user._id },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: '7d'}
    );
};

// signUP
exports.signup = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if(!name || !email || !password) {
            return res.status(400).json({ message: 'All fields are required.' })
        }

        const cleanEmail = email.toLowerCase();

        const existingUser = await User.findOne({
            email: cleanEmail
        });
        if(existingUser){
            return res.status(400).json({ message: 'Email already registered.'});
        }

        const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const hashedOtp = await bcrypt.hash(generatedOtp, salt);

        await Otp.deleteMany({ email: cleanEmail });

        await Otp.create({
            name,
            email: cleanEmail,
            password: hashedPassword,
            otp: hashedOtp
        });

        await sendEmail(cleanEmail, generatedOtp);

        res.status(200).json({ message: 'OTP send to email.'});
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// verify OTP
exports.verifyOtp = async(req, res) => {
    try {
        const {email, otp} = req.body;

        if (!email || !otp) {
            return res.status(400).json({ message: 'Email and otp are required.' });
        }

        const cleanEmail = email.toLowerCase();
        const pendingRecord = await Otp.findOne({
            email: cleanEmail
        });
        if (!pendingRecord) {
            return res.status(400).json({ message: 'OTP expired or registration request not found.' });
        }
        
        const newUser = await User.create({
            name: pendingRecord.name,
            email: pendingRecord.email,
            password: pendingRecord.password
        });

        await Otp.deleteMany({ _id: pendingRecord._id });

        res.status(201).json({
            message: 'Account verified and registered successfully. You can now LogIN.',
            userId: newUser._id
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Login
exports.login = async(req, res) => {
    try {
        const { email, password } = req.body;

        if(!email || !password) {
            return res.status(400).json({ message: 'Emailand password are required.' });
        }

        const cleanEmail = email.toLowerCase();
        const user = await User.findOne({ email: cleanEmail });
        if(!user) {
            return res.status(400).json({ message: 'Invalid credentials.' });
        }
        const isPassword = await bcrypt.compare(password, user.password);
        if(!isPassword) {
            return res.status(400).json({ message: 'Invalid password!' });
        }

        const accessToken = generateAccessToken(user);
        const refreshToken = generateAccessToken(user);

        user.refreshToken = refreshToken;
        await user.save();

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV == 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.status(200).json({
            message: 'Login successful.',
            user : { id: user._id, name: user.name, email: user.email }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Token refresh
exports.refreshToken = async (req, res) => {
    try {
        const token = req.cookie.refreshToken;
        if(!token) {
            return res.status(401).json({ message: 'No refresh token provided.' });
        }

        const user = await User.findOne({ refreshToken: token });
        if(!user) {
            return res.status(403).json({ message: 'Session expired or invalidated. Plese log in again.' });
        }

        jwt.verify(token, process.env.REFRESH_TOKEN_SECRET, (err, decoded) => {
            if (err) {
                return res.status(403).json({ message: 'Invalid or expired refresh token.' });
            }

            const newAccessToken = generateAccessToken(user);
            res.status(200).json({ accessToken: newAccessToken });
        });
    } catch (err) {
        console.error('Refresh error:', err);
        res.status(500).json({ message: 'Server error while refreshing token.' });
    }
};

// logout - clear cookies
exports.logout = async (req, res) => {
  try {
    const token = req.cookies.refreshToken;
    if (token) {
      await User.findOneAndUpdate({ refreshToken: token }, { refreshToken: null });
    }

    res.clearCookie('refreshToken', {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production'
    });

    res.status(200).json({ message: 'Logged out successfully.' });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ message: 'Server error during logout.' });
  }
};