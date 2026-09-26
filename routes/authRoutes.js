const express = require('express');
const authController = require('../controllers/authController');
const verifyAccessToken = require('../middleware/auth');

const router = express.Router();

router.post('/signup', authController.signup);
router.post('/verify-otp', authController.verifyOtp);
router.post('/login', authController.login);
router.post('/refresh', authController.refreshToken);
router.post('/logout', authController.logout);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-Password', authController.resetPassword);

module.exports = router;