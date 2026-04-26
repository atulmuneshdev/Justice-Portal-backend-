const Message = require('../models/Message');
const Advocate = require('../models/Advocate');
const Client = require('../models/Client');
const { uploadFile } = require('../middleware/imagekit');

//  SEND MESSAGE
const mongoose = require('mongoose');

exports.sendMessage = async (req, res) => {
    try {
        const { receiverId, text, receiverModel } = req.body;

        // ✅ Check auth
        if (!req.user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const senderId = req.user.id;
        const senderRole = req.user.role;

        // ✅ Validate receiverId
        if (!receiverId || !mongoose.Types.ObjectId.isValid(receiverId)) {
            return res.status(400).json({ message: 'Valid receiverId required' });
        }

        // ✅ Prevent empty messages
        if (!text && (!req.files || req.files.length === 0)) {
            return res.status(400).json({ message: 'Message cannot be empty' });
        }

        // ✅ Detect receiver model safely
        let finalReceiverModel = receiverModel;
        if (!finalReceiverModel) {
            const isAdvocate = await Advocate.exists({ _id: receiverId });
            finalReceiverModel = isAdvocate ? 'Advocate' : 'Client';
        }

        // ✅ Upload attachments safely
        const attachments = [];

        if (req.files?.length) {
            for (const file of req.files) {
                try {
                    const result = await uploadFile(
                        file.buffer,
                        `msg-${Date.now()}-${file.originalname}`,
                        'chat-attachments'
                    );

                    if (result && result.url) {
                        attachments.push({
                            url: result.url,
                            fileId: result.fileId || '',
                            name: file.originalname,
                            type: file.mimetype?.startsWith('image/') ? 'image' : 'file',
                            size: file.size
                        });
                    }
                } catch (err) {
                    console.error('Upload failed:', err.message);
                }
            }
        }

        // ✅ Create message
        const newMessage = new Message({
            sender: senderId,
            senderModel: senderRole === 'client' ? 'Client' : 'Advocate',
            receiver: receiverId,
            receiverModel: finalReceiverModel,
            text: text?.trim() || '',
            attachments,
            messageType: attachments.length > 0
                ? attachments[0].type
                : 'text'
        });

        await newMessage.save();

        res.status(201).json(newMessage);

    } catch (error) {
        console.error(' sendMessage error:', error);
        res.status(500).json({
            message: 'Internal Server Error',
            error: error.message
        });
    }
};

//  GET MESSAGES (WITH PAGINATION)
exports.getMessages = async (req, res) => {
    try {
        const { otherUserId } = req.params;
        const { page = 1, limit = 20 } = req.query;
        const userId = req.user.id;

        const skip = (page - 1) * limit;

        // ✅ Use chatId (FAST)
        const ids = [userId, otherUserId].sort();
        const chatId = ids.join('_');

        const messages = await Message.find({ chatId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        // ✅ Mark as seen
        await Message.updateMany(
            { sender: otherUserId, receiver: userId, seen: false },
            { $set: { seen: true } }
        );

        res.json(messages.reverse()); // return oldest → newest

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ✅ ADD REACTION
exports.addReaction = async (req, res) => {
    try {
        const { messageId } = req.params;
        const { emoji } = req.body;
        const userId = req.user.id;

        const message = await Message.findById(messageId);
        if (!message) {
            return res.status(404).json({ message: 'Message not found' });
        }

        // ⚠ Ensure schema has reactions field!
        if (!message.reactions) message.reactions = [];

        const index = message.reactions.findIndex(
            r => r.user.toString() === userId
        );

        if (index > -1) {
            message.reactions[index].emoji = emoji;
        } else {
            message.reactions.push({ user: userId, emoji });
        }

        await message.save();
        res.json(message);

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

//  DELETE CHAT (SOFT DELETE)
exports.deleteChat = async (req, res) => {
    try {
        const { otherUserId } = req.params;
        const userId = req.user.id;

        const ids = [userId, otherUserId].sort();
        const chatId = ids.join('_');

        await Message.updateMany(
            { chatId },
            { $set: { isDeleted: true } }
        );

        res.json({ message: 'Chat deleted (soft)' });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};