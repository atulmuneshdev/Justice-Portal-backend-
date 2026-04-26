const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        unique: true,
        sparse: true
    },
    phone: {
        type: String,
        unique: true,
        sparse: true
    },
    password: {
        type: String,
        required: true
    },
    profilePic: {
        url: { type: String, default: '' },
        fileId: { type: String, default: '' }
    },
    backgroundPic: {
        url: { type: String, default: '' },
        fileId: { type: String, default: '' }
    },
    advocates: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Advocate'
    }],
    cases: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Case'
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Client', clientSchema);
