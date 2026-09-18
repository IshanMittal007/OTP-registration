const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Otp = require('../models/Otp');
const sendEmail = require('../utils/sendEmail');

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

        res.status(200).json({
            message: 'Login successful.',
            user : { id: user._id, name: user.name, email: user.email }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};