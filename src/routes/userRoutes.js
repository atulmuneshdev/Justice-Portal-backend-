const express = require('express');
const router = express.Router();
const multer = require('multer');
const {
    getAdvocates,
    getClients,
    updateProfilePic,
    updateBackgroundPic,
    deleteProfilePic,
    deleteBackgroundPic,
    getUserProfile,
    updateProfile
} = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');

const storage = multer.memoryStorage();
const upload = multer({ storage });

router.patch('/profile-pic', authMiddleware, upload.single('profilePic'), updateProfilePic);
router.patch('/background-pic', authMiddleware, upload.single('backgroundPic'), updateBackgroundPic);
router.delete('/profile-pic', authMiddleware, deleteProfilePic);
router.delete('/background-pic', authMiddleware, deleteBackgroundPic);
router.get('/profile/:role/:userId', authMiddleware, getUserProfile);
router.patch('/profile', authMiddleware, updateProfile);
router.get('/advocates', authMiddleware, getAdvocates);
router.get('/clients', authMiddleware, getClients);

module.exports = router;
