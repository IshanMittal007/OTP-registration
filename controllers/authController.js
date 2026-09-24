const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Otp = require('../models/Otp');
const sendEmail = require('../utils/sendEmail');

// Token generation helpers
const generateAccessToken = (user) => {
  return jwt.sign(
    { userId: user._id, email: user.email },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: '15m' } // Fixed: was 'experiesIn'
  );
};

const generateRefreshToken = (user) => {
  return jwt.sign(
    { userId: user._id },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: '7d' }
  );
};

// 1. SIGNUP - Dispatch OTP
exports.signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    const cleanEmail = email.toLowerCase().trim();

    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered.' });
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

    res.status(200).json({ message: 'OTP sent to email.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 2. VERIFY OTP - Check hash & create user
exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const pendingRecord = await Otp.findOne({ email: cleanEmail });

    if (!pendingRecord) {
      return res.status(400).json({ message: 'OTP expired or registration request not found.' });
    }

    // Fixed: Verify the entered OTP against the hashed OTP in MongoDB
    const isMatch = await bcrypt.compare(otp.toString(), pendingRecord.otp);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid verification code.' });
    }

    const newUser = await User.create({
      name: pendingRecord.name,
      email: pendingRecord.email,
      password: pendingRecord.password
    });

    await Otp.deleteMany({ email: cleanEmail });

    res.status(201).json({
      message: 'Account verified and registered successfully. You can now log in.',
      userId: newUser._id
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 3. LOGIN - Issue access token + refresh token cookie
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user); // Fixed: was generateAccessToken

    user.refreshToken = refreshToken;
    await user.save();

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    // Fixed: Return accessToken so client can use it for protected routes
    res.status(200).json({
      message: 'Login successful.',
      accessToken,
      user: { id: user._id, name: user.name, email: user.email }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 4. TOKEN REFRESH - Silent renewal
exports.refreshToken = async (req, res) => {
  try {
    const token = req.cookies?.refreshToken; // Fixed: was req.cookie (must be req.cookies)
    if (!token) {
      return res.status(401).json({ message: 'No refresh token provided.' });
    }

    const user = await User.findOne({ refreshToken: token });
    if (!user) {
      return res.status(403).json({ message: 'Session expired or invalidated. Please log in again.' });
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

// 5. LOGOUT - Clear session
exports.logout = async (req, res) => {
  try {
    const token = req.cookies?.refreshToken;
    if (token) {
      await User.findOneAndUpdate({ refreshToken: token }, { refreshToken: null });
    }

    res.clearCookie('refreshToken', {
      path: '/',
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