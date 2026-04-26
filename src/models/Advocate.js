const mongoose = require('mongoose');

const advocateSchema = new mongoose.Schema({
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
    specialization: {
        type: String,
        default: ''
    },
    experience: {
        type: Number,
        default: 0
    },
    bio: {
        type: String,
        default: ''
    },
    rating: {
        type: Number,
        default: 0
    },
    reviewCount: {
        type: Number,
        default: 0
    },
    hourlyRate: {
        type: Number,
        default: 0
    },
    location: {
        type: String,
        default: ''
    },
    network: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Advocate'
    }],
    clients: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client'
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

module.exports = mongoose.model('Advocate', advocateSchema);
