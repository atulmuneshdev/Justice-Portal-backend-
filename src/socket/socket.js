const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const Message = require('../models/Message');

const setupSocket = (server) => {
    const io = socketIo(server, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST']
        }
    });

    const users = new Map(); // userId -> Set(socketIds)

    //  Auth Middleware
    io.use((socket, next) => {
        const token = socket.handshake.auth.token || socket.handshake.query.token;

        if (!token) {
            return next(new Error('Authentication error: No token provided'));
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
            socket.userId = (decoded.id || decoded._id).toString();
            socket.role = decoded.role;
            next();
        } catch (error) {
            console.error('Socket Auth Error:', error.message);
            next(new Error('Authentication error: Invalid token'));
        }
    });

    io.on('connection', (socket) => {
        console.log(`🚀 User Connected: ${socket.userId} | Role: ${socket.role} | Socket: ${socket.id}`);

        // Join personal room
        socket.join(socket.userId);

        // Handle multiple connections for same user
        if (!users.has(socket.userId)) {
            users.set(socket.userId, new Set());
            socket.broadcast.emit('userOnline', socket.userId);
        }
        users.get(socket.userId).add(socket.id);

        // Broadcast online users
        io.emit('onlineUsers', Array.from(users.keys()));

        // ✅ Join Case Room (FIXED naming)
        socket.on('joinRoom', ({ roomId }) => {
            const room = roomId.startsWith('case:') ? roomId : `case:${roomId}`;
            socket.join(room);
        });

        socket.on('leaveRoom', ({ roomId }) => {
            const room = roomId.startsWith('case:') ? roomId : `case:${roomId}`;
            socket.leave(room);
        });

        // 📩 SEND MESSAGE
        socket.on('sendMessage', async (data) => {
            try {
                const {
                    sender,
                    receiver,
                    text,
                    message,
                    type,
                    messageType,
                    attachments,
                    caseId,
                    _id,
                    senderModel,
                    receiverModel,
                    optimisticId,
                    chatType
                } = data;

                const senderId = sender || socket.userId;
                const messageText = text || message;
                const finalType = messageType || type || 'text';

                let finalMessage;

                // ✅ Already saved via REST
                if (_id) {
                    finalMessage = await Message.findById(_id);
                }

                // ✅ CASE CHAT
                else if (chatType === 'case' && caseId) {
                    const Case = require('../models/Case');
                    const caseData = await Case.findById(caseId);

                    if (caseData) {
                        const newMessage = {
                            sender: senderId,
                            senderModel: senderModel || (socket.role === 'client' ? 'Client' : 'Advocate'),
                            message: messageText,
                            text: messageText, // Add text for compatibility
                            type: finalType,
                            timestamp: Date.now()
                        };

                        caseData.chatHistory.push(newMessage);
                        await caseData.save();

                        finalMessage = caseData.chatHistory.at(-1);
                    }
                }

                // ✅ PRIVATE CHAT
                else {
                    const newMessage = new Message({
                        sender: senderId,
                        senderModel: senderModel || (socket.role === 'client' ? 'Client' : 'Advocate'),
                        receiver,
                        receiverModel: receiverModel || 'Advocate',
                        text: messageText,
                        messageType: finalType,
                        attachments: attachments || [],
                        caseId
                    });

                    await newMessage.save();
                    finalMessage = newMessage;
                }

                if (!finalMessage) return;

                const msgObj = finalMessage.toObject
                    ? finalMessage.toObject()
                    : finalMessage;

                if (optimisticId) msgObj.optimisticId = optimisticId;

                // ✅ DELIVERED STATUS
                if (receiver && !caseId) {
                    const isReceiverOnline = users.has(receiver.toString());
                    if (isReceiverOnline) {
                        msgObj.delivered = true;
                        if (finalMessage.save) {
                            finalMessage.delivered = true;
                            await finalMessage.save();
                        }
                    }

                    // Emit to all receiver's tabs
                    io.to(receiver.toString()).emit('receiveMessage', msgObj);

                    // If receiver is online, also emit delivered status back to sender
                    if (isReceiverOnline) {
                        io.to(socket.userId).emit('message_delivered', {
                            messageId: msgObj._id,
                            receiverId: receiver,
                            optimisticId
                        });
                    }
                }

                // ✅ CASE MESSAGE EMIT
                if (caseId) {
                    io.to(`case:${caseId}`).emit('receiveMessage', msgObj);
                } else if (!receiver) {
                    // If no receiver and no caseId, something is wrong, but let's at least send back to sender
                    io.to(socket.userId).emit('receiveMessage', msgObj);
                } else {
                    // Send back to all sender's other tabs for private messages
                    socket.to(socket.userId).emit('receiveMessage', msgObj);
                }

            } catch (error) {
                console.error('Error sending message:', error);
                socket.emit('messageError', { error: 'Failed to send message' });
            }
        });

        // 👁️ SEEN
        socket.on('mark_seen', async ({ messageId, senderId }) => {
            try {
                const message = await Message.findById(messageId);

                if (
                    message &&
                    message.receiver.toString() === socket.userId.toString()
                ) {
                    message.seen = true;
                    await message.save();

                    io.to(senderId.toString()).emit('message_seen', {
                        messageId,
                        seenBy: socket.userId
                    });
                }
            } catch (error) {
                console.error('Seen error:', error);
            }
        });

        // ✍️ TYPING
        socket.on('typing', ({ receiver, caseId }) => {
            if (caseId) {
                socket.to(`case:${caseId}`).emit('typing', {
                    senderId: socket.userId,
                    caseId: caseId
                });
            } else if (receiver) {
                io.to(receiver.toString()).emit('typing', {
                    senderId: socket.userId
                });
            }
        });

        socket.on('stopTyping', ({ receiver, caseId }) => {
            if (caseId) {
                socket.to(`case:${caseId}`).emit('stopTyping', {
                    senderId: socket.userId,
                    caseId: caseId
                });
            } else if (receiver) {
                io.to(receiver.toString()).emit('stopTyping', {
                    senderId: socket.userId
                });
            }
        });

        // ❌ DISCONNECT
        socket.on('disconnect', () => {
            const userSockets = users.get(socket.userId);
            if (userSockets) {
                userSockets.delete(socket.id);
                if (userSockets.size === 0) {
                    users.delete(socket.userId);
                    io.emit('userOffline', socket.userId);
                    io.emit('onlineUsers', Array.from(users.keys()));
                }
            }
            console.log(`❌ Disconnected: ${socket.userId} | Socket: ${socket.id}`);
        });
    });

    return io;
};

module.exports = setupSocket;