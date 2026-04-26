let io;

const setIO = (ioInstance) => {
    io = ioInstance;
};

const sendNotification = (userId, type, data) => {
    if (io) {
        // Emit to a specific user's private socket room (usually their userId)
        io.to(userId.toString()).emit('notification', { type, data });
    }
};

module.exports = { setIO, sendNotification };
