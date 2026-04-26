const express = require('express');
const router = express.Router();
const {
    advocateSignup,
    advocateLogin,
    clientSignup,
    clientLogin,
    getMe,
    logout
} = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

// Advocate routes
router.post('/advocate/signup', advocateSignup);
router.post('/advocate/login', advocateLogin);

// Client routes
router.post('/client/signup', clientSignup);
router.post('/client/login', clientLogin);

// Common route
router.get('/me', authMiddleware, getMe);
router.get('/logout', logout);

module.exports = router;
