const Message = require('../models/Message');
const Client = require('../models/Client');
const Advocate = require('../models/Advocate');

const getUserModel = async (id, modelType) => {
    try {
        if (modelType === 'Client') {
            return await Client.findById(id).select('name profilePic');
        }
        return await Advocate.findById(id).select('name profilePic');
    } catch (err) {
        return null;
    }
};

// ================= GET MESSAGES =================
exports.getMessages = async (req, res) => {
    try {
        const { userId } = req.params;
        const currentUserId = req.user.id;

        const messages = await Message.find({
            $or: [
                { sender: currentUserId, receiver: userId },
                { sender: userId, receiver: currentUserId }
            ]
        }).sort({ createdAt: 1 });

        const messagesWithUserDetails = await Promise.all(
            messages.map(async (msg) => {
                const msgObj = msg.toObject();

                // ✅ normalize message field (important fix)
                msgObj.text = msgObj.text || msgObj.message || msgObj.content || '';

                if (msg.sender && msg.sender.toString() === currentUserId) {
                    msgObj.isMyMessage = true;
                    msgObj.displayName = 'You';
                } else {
                    msgObj.isMyMessage = false;

                    const sender = msg.sender ? await getUserModel(
                        msg.sender,
                        msg.senderModel || 'Advocate'
                    ) : null;

                    msgObj.displayName = sender?.name || 'Unknown User';
                    msgObj.senderProfilePic = sender?.profilePic || null;
                }

                return msgObj;
            })
        );

        res.json(messagesWithUserDetails);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ================= CHAT LIST =================
exports.getChatList = async (req, res) => {
    try {
        const userId = req.user.id;

        const messages = await Message.find({
            $or: [{ sender: userId }, { receiver: userId }]
        })
            .sort({ createdAt: -1 }) //  latest first
            .populate('sender', 'name profilePic')
            .populate('receiver', 'name profilePic');

        const chatMap = new Map();

        messages.forEach((msg) => {
            const senderId = msg.sender?._id || msg.sender;
            const receiverId = msg.receiver?._id || msg.receiver;

            if (!senderId || !receiverId) return;

            const isSender = senderId.toString() === userId;

            const otherUser = isSender ? msg.receiver : msg.sender;
            const otherModel = isSender ? msg.receiverModel : msg.senderModel;

            if (!otherUser || (!otherUser._id && typeof otherUser !== 'string' && !otherUser.toString())) return;

            const otherId = otherUser._id ? otherUser._id.toString() : otherUser.toString();

            //  only set if not already exists (latest message kept)
            if (!chatMap.has(otherId)) {
                chatMap.set(otherId, {
                    _id: otherId,
                    name: otherUser.name || 'Unknown User',
                    profilePic: otherUser.profilePic || null,
                    role: (otherModel || 'Advocate').toLowerCase(),

                    //  normalize message
                    lastMessage: msg.text || msg.message || msg.content || '',

                    createdAt: msg.createdAt
                });
            }
        });

        res.json(Array.from(chatMap.values()));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};