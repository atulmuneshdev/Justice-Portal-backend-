const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
    name: { type: String, required: true },
    url: { type: String, required: true },
    fileId: { type: String },
    type: { type: String, enum: ['pdf', 'doc', 'docx', 'image'], default: 'pdf' },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, required: true },
    uploadedAt: { type: Date, default: Date.now }
});

const casePhotoSchema = new mongoose.Schema({
    url: { type: String, required: true },
    fileId: { type: String },
    uploadedAt: { type: Date, default: Date.now }
});

const caseSchema = new mongoose.Schema({
    client: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client',
        required: function () { return !this.ownCase; }
    },
    advocate: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Advocate',
        required: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    ownCase: {
        type: Boolean,
        default: false
    },
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    caseType: {
        type: String,
        enum: ['Criminal', 'Civil', 'Family', 'Corporate', 'Intellectual Property', 'Tax', 'Real Estate', 'Other'],
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'active', 'rejected', 'closed'],
        default: 'pending'
    },
    casePhotos: [casePhotoSchema],
    documents: [documentSchema],
    chatHistory: [{
        sender: { type: mongoose.Schema.Types.ObjectId },
        senderModel: { type: String, enum: ['Client', 'Advocate'] },
        message: { type: String },
        text: { type: String }, // Add text for compatibility
        type: { type: String, enum: ['text', 'file'], default: 'text' },
        fileUrl: { type: String },
        fileName: { type: String },
        delivered: { type: Boolean, default: false },
        seen: { type: Boolean, default: false },
        timestamp: { type: Date, default: Date.now }
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

caseSchema.index({ client: 1, advocate: 1 });
caseSchema.index({ status: 1 });

module.exports = mongoose.model('Case', caseSchema);