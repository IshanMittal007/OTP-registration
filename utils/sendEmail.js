const nodemailer = require('nodemailer');

const sendEmail = async(email, otp) => {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    const mailOptions = {
        from: `"Verification Team" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Your Registration OTP',
        text: `Your OTP for registration is: ${otp}. It will expire in 5 minutes.`
    };

    await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;