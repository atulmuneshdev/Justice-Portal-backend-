const Advocate = require('../models/Advocate');
const Client = require('../models/Client');
const Connection = require('../models/Connection');
const Post = require('../models/Post');
const { uploadFile, deleteFile } = require('../middleware/imagekit');
const { sendNotification } = require('../socket/notification');

exports.updateProfilePic = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

        const userId = req.user.id;
        const role = req.user.role;

        let user;
        if (role === 'advocate') {
            user = await Advocate.findById(userId);
        } else {
            user = await Client.findById(userId);
        }

        if (!user) return res.status(404).json({ message: 'User not found' });

        // Delete old profile pic from ImageKit if exists
        if (user.profilePic && user.profilePic.fileId) {
            await deleteFile(user.profilePic.fileId).catch(err => console.error("Old profile pic deletion failed:", err));
        }

        const uploadResult = await uploadFile(req.file.buffer, `profile_${userId}_${Date.now()}`);

        user.profilePic = {
            url: uploadResult.url,
            fileId: uploadResult.fileId
        };

        await user.save();

        res.json({ message: 'Profile picture updated successfully', user });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.updateBackgroundPic = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

        const userId = req.user.id;
        const role = req.user.role;

        let user;
        if (role === 'advocate') {
            user = await Advocate.findById(userId);
        } else {
            user = await Client.findById(userId);
        }

        if (!user) return res.status(404).json({ message: 'User not found' });

        // Delete old background pic from ImageKit if exists
        if (user.backgroundPic && user.backgroundPic.fileId) {
            await deleteFile(user.backgroundPic.fileId).catch(err => console.error("Old background pic deletion failed:", err));
        }

        const uploadResult = await uploadFile(req.file.buffer, `background_${userId}_${Date.now()}`);

        user.backgroundPic = {
            url: uploadResult.url,
            fileId: uploadResult.fileId
        };

        await user.save();

        res.json({ message: 'Background picture updated successfully', user });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.deleteProfilePic = async (req, res) => {
    try {
        const userId = req.user.id;
        const role = req.user.role;

        let user;
        if (role === 'advocate') {
            user = await Advocate.findById(userId);
        } else {
            user = await Client.findById(userId);
        }

        if (!user) return res.status(404).json({ message: 'User not found' });

        if (user.profilePic && user.profilePic.fileId) {
            await deleteFile(user.profilePic.fileId);
            user.profilePic = { url: '', fileId: '' };
            await user.save();
        }

        res.json({ message: 'Profile picture deleted successfully', user });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.deleteBackgroundPic = async (req, res) => {
    try {
        const userId = req.user.id;
        const role = req.user.role;

        let user;
        if (role === 'advocate') {
            user = await Advocate.findById(userId);
        } else {
            user = await Client.findById(userId);
        }

        if (!user) return res.status(404).json({ message: 'User not found' });

        if (user.backgroundPic && user.backgroundPic.fileId) {
            await deleteFile(user.backgroundPic.fileId);
            user.backgroundPic = { url: '', fileId: '' };
            await user.save();
        }

        res.json({ message: 'Background picture deleted successfully', user });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getUserProfile = async (req, res) => {
    try {
        const { userId, role } = req.params; // Expecting role in params to know which model to query

        let user;
        if (role === 'advocate') {
            user = await Advocate.findById(userId).select('-password');
        } else {
            user = await Client.findById(userId).select('-password');
        }

        if (!user) return res.status(404).json({ message: 'User not found' });

        // Get all posts by this user (only advocates can have posts in current system)
        let posts = [];
        if (role === 'advocate') {
            posts = await Post.find({ advocate: userId })
                .populate('advocate', 'name profilePic specialization')
                .sort({ createdAt: -1 });
        }

        res.json({ user, posts });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const role = req.user.role;
        const updates = req.body;

        let user;
        if (role === 'advocate') {
            user = await Advocate.findByIdAndUpdate(userId, updates, { new: true }).select('-password');
        } else {
            user = await Client.findByIdAndUpdate(userId, updates, { new: true }).select('-password');
        }

        if (!user) return res.status(404).json({ message: 'User not found' });

        res.json({ message: 'Profile updated successfully', user });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getAdvocates = async (req, res) => {
    try {
        const { specialization, minExperience, maxExperience, minRating, maxRate, search } = req.query;
        const currentUserId = req.user.id;
        let query = { _id: { $ne: currentUserId } };

        if (search) {
            query.name = { $regex: search, $options: 'i' };
        }

        if (specialization) {
            query.specialization = specialization;
        }

        if (minExperience || maxExperience) {
            query.experience = {};
            if (minExperience) query.experience.$gte = Number(minExperience);
            if (maxExperience) query.experience.$lte = Number(maxExperience);
        }

        if (minRating) {
            query.rating = { $gte: Number(minRating) };
        }

        if (maxRate) {
            query.hourlyRate = { $lte: Number(maxRate) };
        }

        const advocates = await Advocate.find(query).select('-password');
        res.json(advocates);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getClients = async (req, res) => {
    try {
        const { search } = req.query;
        const currentUserId = req.user.id;
        let query = { _id: { $ne: currentUserId } };

        if (search) {
            query.name = { $regex: search, $options: 'i' };
        }

        const clients = await Client.find(query).select('-password');
        res.json(clients);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ... existing profile update controllers ...
