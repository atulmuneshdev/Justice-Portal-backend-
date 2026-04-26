const Connection = require('../models/Connection');
const Advocate = require('../models/Advocate');
const Message = require('../models/Message');
const { sendNotification } = require('../socket/notification');

exports.sendConnectionRequest = async (req, res) => {
    try {
        const { receiverId } = req.body;
        const senderId = req.user.id;

        if (senderId === receiverId) {
            return res.status(400).json({ message: 'Cannot connect with yourself' });
        }

        const receiver = await Advocate.findById(receiverId);
        if (!receiver) {
            return res.status(400).json({ message: 'Receiver must be an advocate' });
        }

        const existingConnection = await Connection.findOne({
            $or: [
                { sender: senderId, receiver: receiverId },
                { sender: receiverId, receiver: senderId }
            ]
        });

        if (existingConnection) {
            return res.status(400).json({ message: 'Connection already exists or is pending' });
        }

        const newConnection = new Connection({
            sender: senderId,
            senderModel: req.user.role === 'client' ? 'Client' : 'Advocate',
            receiver: receiverId,
            receiverModel: 'Advocate', // Requests are always sent to advocates in this app
            status: 'pending'
        });
        await newConnection.save();

        sendNotification(receiverId, 'connection_request', {
            requester: {
                id: senderId,
                name: req.user.name
            },
            connectionId: newConnection._id
        });

        res.status(201).json({ message: 'Request sent successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.acceptConnectionRequest = async (req, res) => {
    try {
        const { connectionId } = req.params;
        const userId = req.user.id;

        const connection = await Connection.findById(connectionId);
        if (!connection || connection.receiver.toString() !== userId) {
            return res.status(404).json({ message: 'Request not found or unauthorized' });
        }

        connection.status = 'accepted';
        await connection.save();

        sendNotification(connection.sender, 'connection_accepted', {
            acceptor: {
                id: userId,
                name: req.user.name
            }
        });

        res.json({ message: 'Request accepted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.rejectConnectionRequest = async (req, res) => {
    try {
        const { connectionId } = req.params;
        const userId = req.user.id;

        const connection = await Connection.findById(connectionId);
        if (!connection || connection.receiver.toString() !== userId) {
            return res.status(404).json({ message: 'Request not found or unauthorized' });
        }

        connection.status = 'rejected';
        await connection.save();

        res.json({ message: 'Request rejected' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getMyConnections = async (req, res) => {
    try {
        const userId = req.user.id;
        const connections = await Connection.find({
            $or: [{ sender: userId }, { receiver: userId }],
            status: 'accepted'
        }).populate('sender receiver', 'name email profilePic specialization role');

        const connectedAdvocates = await Promise.all(connections.map(async (c) => {
            if (!c.sender || !c.receiver) return null;
            
            const senderId = c.sender._id ? c.sender._id.toString() : c.sender.toString();
            const otherUser = senderId === userId ? c.receiver : c.sender;
            const otherUserId = otherUser._id || otherUser;
            
            if (!otherUserId) return null;

            // Get last message
            const lastMessage = await Message.findOne({
                $or: [
                    { sender: userId, receiver: otherUserId },
                    { sender: otherUserId, receiver: userId }
                ]
            }).sort({ createdAt: -1 });

            // Get unread count
            const unreadCount = await Message.countDocuments({
                sender: otherUserId,
                receiver: userId,
                seen: false
            });

            const otherUserObj = otherUser.toObject ? otherUser.toObject() : { _id: otherUser };

            return {
                ...otherUserObj,
                lastMessage,
                unreadCount
            };
        }));

        res.json(connectedAdvocates.filter(Boolean));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getPendingRequests = async (req, res) => {
    try {
        const userId = req.user.id;
        const requests = await Connection.find({ receiver: userId, status: 'pending' })
            .populate('sender', 'name email profilePic specialization role');
        res.json(requests);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getSentRequests = async (req, res) => {
    try {
        const userId = req.user.id;
        const requests = await Connection.find({ sender: userId, status: 'pending' })
            .populate('receiver', 'name email profilePic specialization role');
        res.json(requests);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.cancelRequest = async (req, res) => {
    try {
        const { connectionId } = req.params;
        const userId = req.user.id;

        const connection = await Connection.findOneAndDelete({
            _id: connectionId,
            sender: userId,
            status: 'pending'
        });

        if (!connection) {
            return res.status(404).json({ message: 'Request not found or unauthorized' });
        }

        res.json({ message: 'Request cancelled successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getConnectionStatus = async (req, res) => {
    try {
        const { advocateId } = req.params;
        const userId = req.user.id;

        const connection = await Connection.findOne({
            $or: [
                { sender: userId, receiver: advocateId },
                { sender: advocateId, receiver: userId }
            ]
        });

        if (!connection) {
            return res.json({ status: 'none' });
        }

        if (connection.status === 'pending') {
            const isSentByMe = connection.sender.toString() === userId;
            return res.json({
                status: 'pending',
                direction: isSentByMe ? 'sent' : 'received',
                connectionId: connection._id
            });
        }

        if (connection.status === 'accepted') {
            return res.json({ status: 'connected', connectionId: connection._id });
        }

        return res.json({ status: 'none' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
