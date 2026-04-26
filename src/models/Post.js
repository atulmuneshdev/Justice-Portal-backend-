const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
    advocate: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Advocate',
        required: true
    },
    content: {
        type: String,
        required: true
    },
    media: {
        url: { type: String, default: '' },
        fileId: { type: String, default: '' },
        type: {
            type: String,
            enum: ['image', 'video', 'none'],
            default: 'none'
        }
    },
    likes: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            refPath: 'likes.userModel'
        },
        userModel: {
            type: String,
            required: true,
            enum: ['Advocate', 'Client']
        }
    }],
    comments: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            refPath: 'comments.userModel'
        },
        userModel: {
            type: String,
            required: true,
            enum: ['Advocate', 'Client']
        },
        text: {
            type: String,
            required: true
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }]
}, { timestamps: true });

module.exports = mongoose.model('Post', postSchema);