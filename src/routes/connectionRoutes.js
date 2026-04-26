const express = require('express');
const router = express.Router();
const {
    sendConnectionRequest,
    acceptConnectionRequest,
    rejectConnectionRequest,
    getMyConnections,
    getPendingRequests,
    getSentRequests,
    cancelRequest,
    getConnectionStatus
} = require('../controllers/connectionController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/request', authMiddleware, sendConnectionRequest);

// ✅ Accept Connection
router.put('/accept/:connectionId', authMiddleware, acceptConnectionRequest);

// ❌ GET to /accept is not allowed
router.get('/accept/:connectionId', authMiddleware, (req, res) => {
    res.status(405).json({ 
        message: 'Method Not Allowed: Please use PUT to accept a connection request.',
        method: 'PUT',
        url: `/api/connections/accept/${req.params.connectionId}`
    });
});

// ❌ Missing ID handler
router.all('/accept', authMiddleware, (req, res) => {
    res.status(400).json({ 
        message: 'Bad Request: Connection ID is missing in the URL.',
        hint: 'Expected URL: /api/connections/accept/[CONNECTION_ID]'
    });
});

router.put('/reject/:connectionId', authMiddleware, rejectConnectionRequest);
router.get('/my', authMiddleware, getMyConnections);
router.get('/pending', authMiddleware, getPendingRequests);
router.get('/sent', authMiddleware, getSentRequests);
router.delete('/cancel/:connectionId', authMiddleware, cancelRequest);
router.get('/status/:advocateId', authMiddleware, getConnectionStatus);

module.exports = router;
