const express = require('express');
const router = express.Router();
const multer = require('multer');

const {
  createPost,
  getPosts,
  likePost,
  commentOnPost,
  updatePost,
  deletePost,
  updateComment,
  deleteComment
} = require('../controllers/postController');
const authMiddleware = require('../middleware/authMiddleware');

// ✅ Multer config (memory storage for ImageKit)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit (for images/videos)
  }
});

// ================= ROUTES =================

// ✅ Create Post (with image/video)
router.post('/', authMiddleware, upload.single('media'), createPost);

// ✅ Get All Posts
router.get('/', authMiddleware, getPosts);

// ✅ Like Post
router.post('/:id/like', authMiddleware, likePost);

// ✅ Comment on Post
router.post('/:id/comment', authMiddleware, commentOnPost);

// ✅ Update Comment
router.put('/:id/comment/:commentId', authMiddleware, updateComment);

// ✅ Delete Comment
router.delete('/:id/comment/:commentId', authMiddleware, deleteComment);

// ✅ Update Post (with optional media)
router.put('/:id', authMiddleware, upload.single('media'), updatePost);

// ✅ Delete Post
router.delete('/:id', authMiddleware, deletePost);

module.exports = router;