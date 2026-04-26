const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: 'senderModel',
        index: true
    },
    senderModel: {
        type: String,
        required: true,
        enum: ['Advocate', 'Client']
    },
    receiver: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: 'receiverModel',
        index: true
    },
    receiverModel: {
        type: String,
        required: true,
        enum: ['Advocate', 'Client']
    },

    //  Message Content
    text: {
        type: String,
        trim: true,
        default: ''
    },

    messageType: {
        type: String,
        enum: ['text', 'image', 'file'],
        default: 'text',
        index: true
    },

    //  Attachments
    attachments: [{
        url: { type: String, required: true },
        name: String,
        fileId: String,
        type: String, // mime type
        size: Number
    }],

    //  Case Chat Support
    caseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Case',
        index: true
    },

    //  Chat Thread (IMPORTANT for performance)
    chatId: {
        type: String,
        index: true
    },

    //  Message Status
    delivered: {
        type: Boolean,
        default: false,
        index: true
    },
    seen: {
        type: Boolean,
        default: false,
        index: true
    },

    //  Soft Delete (for future delete feature)
    isDeleted: {
        type: Boolean,
        default: false
    }

}, {
    timestamps: true
});

//  AUTO CREATE chatId (VERY IMPORTANT)
messageSchema.pre('save', function () {
    if (!this.chatId && this.sender && this.receiver) {
        const ids = [this.sender.toString(), this.receiver.toString()].sort();
        this.chatId = ids.join('_');
    }

});

//  Index for fast chat loading
messageSchema.index({ chatId: 1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);