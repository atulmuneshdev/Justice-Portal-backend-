const Case = require('../models/Case');
const Client = require('../models/Client');
const Advocate = require('../models/Advocate');
const { sendNotification } = require('../socket/notification');
const { uploadFile } = require('../middleware/imagekit');

exports.createCase = async (req, res) => {
    try {
        const { advocateId, title, description, caseType, ownCase } = req.body;
        const userId = req.user.id;
        const userRole = req.user.role;

        let caseData = {
            title,
            description,
            caseType,
            createdBy: userId,
            status: 'pending'
        };

        if (userRole === 'advocate' && (ownCase === 'true' || ownCase === true)) {
            caseData.ownCase = true;
            caseData.advocate = userId;
            caseData.status = 'active'; // Own cases start as active
        } else {
            if (!advocateId || advocateId === '') {
                return res.status(400).json({ message: 'Advocate ID is required for this case type' });
            }
            caseData.advocate = advocateId;
            if (userRole === 'client') {
                caseData.client = userId;
            } else {
                // If an advocate creates a case for a client, they'd need to provide clientId
                const clientId = req.body.clientId;
                if (!clientId || clientId === '') {
                    return res.status(400).json({ message: 'Client ID is required' });
                }
                caseData.client = clientId;
            }
        }

        const casePhotos = [];
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                const result = await uploadFile(file.buffer, `case-doc-${Date.now()}-${file.originalname}`, 'legal-portal');
                casePhotos.push({
                    url: result.url,
                    fileId: result.fileId
                });
            }
        }
        caseData.casePhotos = casePhotos;

        const newCase = new Case(caseData);
        await newCase.save();

        if (caseData.advocate && !caseData.ownCase) {
            sendNotification(caseData.advocate, 'case_request', {
                caseId: newCase._id,
                clientName: req.user.name || 'Client',
                title,
                caseType
            });
        }

        res.status(201).json({ message: 'Case created successfully', case: newCase });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getCases = async (req, res) => {
    try {
        const userId = req.user.id;
        const userRole = req.user.role;
        const { tab } = req.query;

        let query = {};

        if (userRole === 'client') {
            query.client = userId;
        } else if (userRole === 'advocate') {
            if (tab === 'assigned') {
                query.advocate = userId;
                query.ownCase = false;
            } else if (tab === 'own') {
                query.advocate = userId;
                query.ownCase = true;
            } else {
                query.advocate = userId;
            }
        }

        const cases = await Case.find(query)
            .populate('client', 'name email profilePic')
            .populate('advocate', 'name email specialization profilePic')
            .sort({ updatedAt: -1 });

        const casesWithUnread = cases.map(c => {
            const unreadCount = c.chatHistory.filter(m =>
                m.sender && m.sender.toString() !== userId && !m.seen
            ).length;

            const lastMessage = c.chatHistory.length > 0
                ? c.chatHistory[c.chatHistory.length - 1]
                : null;

            return {
                ...c.toObject(),
                unreadCount,
                lastMessage
            };
        });

        res.json(casesWithUnread);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getSingleCase = async (req, res) => {
    try {
        const { caseId } = req.params;
        const userId = req.user.id;

        const caseData = await Case.findById(caseId)
            .populate('client', 'name email phone profilePic')
            .populate('advocate', 'name email phone specialization profilePic');

        if (!caseData) {
            return res.status(404).json({ message: 'Case not found' });
        }

        const isParticipant =
            (caseData.createdBy && caseData.createdBy.toString() === userId) ||
            (caseData.client && caseData.client._id && caseData.client._id.toString() === userId) ||
            (caseData.advocate && caseData.advocate._id && caseData.advocate._id.toString() === userId);

        if (!isParticipant) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        res.json(caseData);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.updateCase = async (req, res) => {
    try {
        const { caseId } = req.params;
        const { title, description, caseType, status } = req.body;
        const userId = req.user.id;

        const caseData = await Case.findById(caseId);
        if (!caseData) {
            return res.status(404).json({ message: 'Case not found' });
        }

        const canEdit =
            caseData.createdBy.toString() === userId ||
            (caseData.advocate && caseData.advocate.toString() === userId);

        if (!canEdit) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        if (title) caseData.title = title;
        if (description) caseData.description = description;
        if (caseType) caseData.caseType = caseType;
        if (status) caseData.status = status;

        caseData.updatedAt = Date.now();
        await caseData.save();

        res.json({ message: 'Case updated successfully', case: caseData });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.deleteCase = async (req, res) => {
    try {
        const { caseId } = req.params;
        const userId = req.user.id;

        const caseData = await Case.findById(caseId);
        if (!caseData) {
            return res.status(404).json({ message: 'Case not found' });
        }

        if (caseData.createdBy.toString() !== userId) {
            return res.status(401).json({ message: 'Not authorized. Only creator can delete.' });
        }

        await Case.findByIdAndDelete(caseId);

        res.json({ message: 'Case deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.addDocument = async (req, res) => {
    try {
        const { caseId, name, url, fileId, type } = req.body;
        const userId = req.user.id;

        const caseData = await Case.findById(caseId);
        if (!caseData) {
            return res.status(404).json({ message: 'Case not found' });
        }

        const isParticipant =
            (caseData.client && caseData.client.toString() === userId) ||
            (caseData.advocate && caseData.advocate.toString() === userId);

        if (!isParticipant) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        caseData.documents.push({ name, url, fileId, type, uploadedBy: userId });
        caseData.updatedAt = Date.now();
        await caseData.save();

        res.json({ message: 'Document added successfully', documents: caseData.documents });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getCaseChat = async (req, res) => {
    try {
        const { caseId } = req.params;
        const userId = req.user.id;

        const caseData = await Case.findById(caseId);
        if (!caseData) {
            return res.status(404).json({ message: 'Case not found' });
        }

        const isParticipant =
            (caseData.client && caseData.client.toString() === userId) ||
            (caseData.advocate && caseData.advocate.toString() === userId);

        if (!isParticipant) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        res.json(caseData.chatHistory);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.addCaseMessage = async (req, res) => {
    try {
        const { caseId, message, type, fileUrl, fileName } = req.body;
        const userId = req.user.id;

        const caseData = await Case.findById(caseId);
        if (!caseData) {
            return res.status(404).json({ message: 'Case not found' });
        }

        const isParticipant =
            (caseData.client && caseData.client.toString() === userId) ||
            (caseData.advocate && caseData.advocate.toString() === userId);

        if (!isParticipant) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        const senderModel = req.user.role === 'client' ? 'Client' : 'Advocate';

        const newMessage = {
            sender: userId,
            senderModel,
            message,
            text: message, // Add text field for compatibility with Message model and socket
            type: type || 'text',
            fileUrl,
            fileName,
            timestamp: Date.now()
        };

        caseData.chatHistory.push(newMessage);
        caseData.updatedAt = Date.now();
        await caseData.save();

        // Get the last added message which will have an _id from mongoose
        const savedMessage = caseData.chatHistory[caseData.chatHistory.length - 1];

        res.json({ message: 'Message sent successfully', chatMessage: savedMessage });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
