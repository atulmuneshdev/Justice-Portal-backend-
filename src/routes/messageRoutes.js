const express = require('express');
const router = express.Router();
const multer = require('multer');
const { 
    sendMessage, 
    getMessages, 
    addReaction, 
    deleteChat 
} = require('../controllers/messageController');
const authMiddleware = require('../middleware/authMiddleware');

const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

router.post('/send', authMiddleware, upload.array('attachments', 5), sendMessage);
router.get('/:otherUserId', authMiddleware, getMessages);
router.post('/react/:messageId', authMiddleware, addReaction);
router.delete('/:otherUserId', authMiddleware, deleteChat);

module.exports = router;
