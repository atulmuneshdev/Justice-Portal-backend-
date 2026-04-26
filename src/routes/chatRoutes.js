const express = require('express');
const router = express.Router();
const { getMessages, getChatList } = require('../controllers/chatController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/list', authMiddleware, getChatList);
router.get('/:userId', authMiddleware, getMessages);

module.exports = router;
