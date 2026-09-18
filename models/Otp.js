const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
    name : { type: String, required: true },
    email : { type: String, required: true, unique: true,lowercase: true },
    password : { type: String, required: true },
    otp: { type: String, required: true },
    createdAt : { type: Date, default: Date.now, index: { expires: 300 } }
});

module.exports = mongoose.model('Otp', otpSchema);