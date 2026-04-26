const mongoose = require('mongoose');

const connectionSchema = new mongoose.Schema({
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: 'senderModel'
    },
    senderModel: {
        type: String,
        required: true,
        enum: ['Advocate', 'Client']
    },
    receiver: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: 'receiverModel'
    },
    receiverModel: {
        type: String,
        required: true,
        enum: ['Advocate', 'Client']
    },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'rejected'],
        default: 'pending'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Ensure a user cannot send multiple requests to the same person
connectionSchema.index({ sender: 1, receiver: 1 }, { unique: true });

module.exports = mongoose.model('Connection', connectionSchema);
