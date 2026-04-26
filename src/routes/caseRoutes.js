const express = require('express');
const router = express.Router();
const multer = require('multer');
const { 
    createCase, 
    getCases, 
    updateCase, 
    deleteCase, 
    getSingleCase, 
    getCaseChat, 
    addCaseMessage, 
    addDocument 
} = require('../controllers/caseController');
const authMiddleware = require('../middleware/authMiddleware');

const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

router.post('/', authMiddleware, upload.array('casePhotos', 5), createCase);
router.get('/', authMiddleware, getCases);
router.get('/:caseId', authMiddleware, getSingleCase);
router.put('/:caseId', authMiddleware, updateCase);
router.delete('/:caseId', authMiddleware, deleteCase);

router.post('/document', authMiddleware, addDocument);
router.get('/:caseId/chat', authMiddleware, getCaseChat);
router.post('/:caseId/chat', authMiddleware, addCaseMessage);

module.exports = router;
