const Advocate = require('../models/Advocate');
const Client = require('../models/Client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Helper to generate token
const generateToken = (user, role) => {
    return jwt.sign({ id: user._id, role: role }, process.env.JWT_SECRET || 'secret', {
        expiresIn: '7d'
    });
};

const sendTokenResponse = (user, role, statusCode, res) => {
    const token = generateToken(user, role);

    const options = {
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
    };

    res.status(statusCode)
        .cookie('token', token, options)
        .json({
            token, // keeping for backward compatibility
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: role
            }
        });
};

// --- ADVOCATE AUTH ---

exports.advocateSignup = async (req, res) => {
    try {
        let { name, email, phone, password, specialization, experience, bio } = req.body;
        console.log('Signup attempt for advocate:', { name, email, phone });

        // Clean empty strings to undefined for sparse unique index
        if (email === '') email = undefined;
        if (phone === '') phone = undefined;

        if (!email && !phone) {
            return res.status(400).json({ message: 'Email or phone number is required' });
        }

        // Check if advocate already exists by email or phone
        const conflictFilters = [];
        if (email) conflictFilters.push({ email });
        if (phone) conflictFilters.push({ phone });

        const existingAdvocate = await Advocate.findOne({
            $or: conflictFilters
        });

        if (existingAdvocate) {
            const conflictField = existingAdvocate.email === email ? 'email' : 'phone';
            console.log(`Advocate already exists with this ${conflictField}:`, email || phone);
            return res.status(400).json({ message: `Advocate with this ${conflictField} already exists` });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const advocate = new Advocate({
            name,
            email,
            phone,
            password: hashedPassword,
            specialization,
            experience,
            bio
        });

        await advocate.save();
        console.log('Advocate registered successfully:', email || phone);

        sendTokenResponse(advocate, 'advocate', 201, res);
    } catch (error) {
        console.error('Advocate signup controller error:', error);
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern)[0];
            return res.status(400).json({ message: `An account with this ${field} already exists` });
        }
        res.status(500).json({ message: 'Internal Server Error during signup' });
    }
};

exports.advocateLogin = async (req, res) => {
    try {
        let { email, phone, password } = req.body;
        console.log('Login attempt for advocate:', { email, phone });

        // Clean empty strings
        if (email === '') email = undefined;
        if (phone === '') phone = undefined;

        if (!email && !phone) {
            return res.status(400).json({ message: 'Email or phone number is required' });
        }

        let query = {};
        if (email) query.email = email;
        else query.phone = phone;

        const advocate = await Advocate.findOne(query);
        if (!advocate) {
            console.log('Advocate not found with query:', query);
            return res.status(401).json({ message: 'Invalid credentials or not an advocate' });
        }

        const isMatch = await bcrypt.compare(password, advocate.password);
        if (!isMatch) {
            console.log('Password mismatch for advocate:', email || phone);
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        console.log('Login successful for advocate:', advocate.email || advocate.phone);
        sendTokenResponse(advocate, 'advocate', 200, res);
    } catch (error) {
        console.error('Advocate login controller error:', error);
        res.status(500).json({ message: 'Internal Server Error during login' });
    }
};

// --- CLIENT AUTH ---

exports.clientSignup = async (req, res) => {
    try {
        let { name, email, phone, password } = req.body;
        console.log('Signup attempt for client:', { email, phone });

        // Clean empty strings to undefined for sparse unique index
        if (email === '') email = undefined;
        if (phone === '') phone = undefined;

        if (!email && !phone) {
            return res.status(400).json({ message: 'Email or phone number is required' });
        }

        // Check if client already exists by email or phone
        const conflictFilters = [];
        if (email) conflictFilters.push({ email });
        if (phone) conflictFilters.push({ phone });

        const existingClient = await Client.findOne({
            $or: conflictFilters
        });

        if (existingClient) {
            const conflictField = existingClient.email === email ? 'email' : 'phone';
            console.log(`Client already exists with this ${conflictField}:`, email || phone);
            return res.status(400).json({ message: `Client with this ${conflictField} already exists` });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const client = new Client({
            name,
            email,
            phone,
            password: hashedPassword
        });

        await client.save();
        console.log('Client registered successfully:', email || phone);

        sendTokenResponse(client, 'client', 201, res);
    } catch (error) {
        console.error('Client signup controller error:', error);
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern)[0];
            return res.status(400).json({ message: `An account with this ${field} already exists` });
        }
        res.status(500).json({ message: 'Internal Server Error during signup' });
    }
};

exports.clientLogin = async (req, res) => {
    try {
        let { email, phone, password } = req.body;
        console.log('Login attempt for client:', { email, phone });

        // Clean empty strings
        if (email === '') email = undefined;
        if (phone === '') phone = undefined;

        if (!email && !phone) {
            return res.status(400).json({ message: 'Email or phone number is required' });
        }

        let query = {};
        if (email) query.email = email;
        else query.phone = phone;

        const client = await Client.findOne(query);
        if (!client) {
            console.log('Client not found with query:', query);
            return res.status(401).json({ message: 'Invalid credentials or not a client' });
        }

        const isMatch = await bcrypt.compare(password, client.password);
        if (!isMatch) {
            console.log('Password mismatch for client:', email || phone);
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        console.log('Login successful for client:', client.email || client.phone);
        sendTokenResponse(client, 'client', 200, res);
    } catch (error) {
        console.error('Client login controller error:', error);
        res.status(500).json({ message: 'Internal Server Error during login' });
    }
};

exports.getMe = async (req, res) => {
    try {
        let user;
        if (req.user.role === 'advocate') {
            user = await Advocate.findById(req.user.id).select('-password');
        } else {
            user = await Client.findById(req.user.id).select('-password');
        }
        if (!user) return res.status(404).json({ message: 'User not found' });

        const userObj = user.toObject();
        userObj.id = user._id; // Add id field for consistency
        userObj.role = req.user.role;
        res.json(userObj);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.logout = async (req, res) => {
    res.cookie('token', 'none', {
        expires: new Date(Date.now() + 10 * 1000),
        httpOnly: true
    });

    res.status(200).json({
        success: true,
        message: 'Logged out successfully'
    });
};
