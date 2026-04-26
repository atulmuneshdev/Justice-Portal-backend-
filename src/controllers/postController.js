const Post = require('../models/Post');
const { uploadFile, deleteFile } = require('../middleware/imagekit');

// Middleware helper to check if the user is an advocate
const checkAdvocate = (req, res, next) => {
    if (req.user.role !== 'advocate') {
        return res.status(403).json({ message: 'Only advocates can perform this action' });
    }
    next();
};

exports.createPost = async (req, res) => {
    try {
        console.log('Create Post Request:', {
            body: req.body,
            file: req.file ? {
                name: req.file.originalname,
                size: req.file.size,
                mimetype: req.file.mimetype
            } : 'No file'
        });

        if (req.user.role !== 'advocate') {
            return res.status(403).json({ message: 'Only advocates can create posts' });
        }

        const { content } = req.body;
        let media = { url: '', type: 'none', fileId: '' };

        if (req.file) {
            console.log('Attempting ImageKit upload...');
            const uploadResult = await uploadFile(req.file.buffer, req.file.originalname);
            console.log('ImageKit upload result:', uploadResult);
            media = {
                url: uploadResult.url,
                type: req.file.mimetype.startsWith('image') ? 'image' : 'video',
                fileId: uploadResult.fileId
            };
        }

        const newPost = new Post({
            advocate: req.user.id,
            content,
            media
        });

        await newPost.save();
        res.status(201).json(newPost);
    } catch (error) {
        console.error('Create Post Error:', error);
        res.status(500).json({ message: error.message });
    }
};

exports.getPosts = async (req, res) => {
    try {
        const posts = await Post.find()
            .populate('advocate', 'name profilePic specialization')
            .populate({
                path: 'comments.user',
                select: 'name profilePic'
            })
            .populate({
                path: 'likes.user',
                select: 'name profilePic'
            })
            .sort({ createdAt: -1 });

        // Log success for debugging
        console.log(`Fetched ${posts.length} posts successfully`);
        res.json(posts);
    } catch (error) {
        console.error('Get Posts Error:', error);
        res.status(500).json({ message: error.message });
    }
};

exports.updatePost = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: 'Post not found' });

        // Advocate only + Owner only
        if (req.user.role !== 'advocate' || post.advocate.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Unauthorized: Only the advocate owner can edit this post' });
        }

        const { content } = req.body;
        if (content !== undefined) post.content = content;

        if (req.file) {
            // Delete old file from ImageKit
            if (post.media && post.media.fileId) {
                await deleteFile(post.media.fileId).catch(err => console.error("Old file deletion failed:", err));
            }

            const uploadResult = await uploadFile(req.file.buffer, req.file.originalname);
            post.media = {
                url: uploadResult.url,
                type: req.file.mimetype.startsWith('image') ? 'image' : 'video',
                fileId: uploadResult.fileId
            };
        }

        await post.save();
        res.json(post);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.deletePost = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: 'Post not found' });

        // Advocate only + Owner only
        if (req.user.role !== 'advocate' || post.advocate.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Unauthorized: Only the advocate owner can delete this post' });
        }

        if (post.media && post.media.fileId) {
            await deleteFile(post.media.fileId).catch(err => console.error("File deletion failed:", err));
        }

        await Post.findByIdAndDelete(req.params.id);
        res.json({ message: 'Post deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.likePost = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: 'Post not found' });

        const userId = req.user.id;
        const userModel = req.user.role === 'advocate' ? 'Advocate' : 'Client';

        const index = post.likes.findIndex(l => l.user && l.user.toString() === userId);

        if (index === -1) {
            post.likes.push({ user: userId, userModel });
        } else {
            post.likes.splice(index, 1);
        }

        await post.save();
        res.json(post);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.commentOnPost = async (req, res) => {
    try {
        const { text } = req.body;
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: 'Post not found' });

        const userId = req.user.id;
        const userModel = req.user.role === 'advocate' ? 'Advocate' : 'Client';

        post.comments.push({
            user: userId,
            userModel,
            text
        });

        await post.save();
        res.json(post);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.updateComment = async (req, res) => {
    try {
        const { text } = req.body;
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: 'Post not found' });

        const comment = post.comments.id(req.params.commentId);
        if (!comment) return res.status(404).json({ message: 'Comment not found' });

        // Owner only
        if (comment.user.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Unauthorized: Only the comment owner can edit this comment' });
        }

        comment.text = text;
        await post.save();
        res.json(post);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.deleteComment = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: 'Post not found' });

        const comment = post.comments.id(req.params.commentId);
        if (!comment) return res.status(404).json({ message: 'Comment not found' });

        // Owner only or Post owner
        if (comment.user.toString() !== req.user.id && post.advocate.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        post.comments.pull(req.params.commentId);
        await post.save();
        res.json(post);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};