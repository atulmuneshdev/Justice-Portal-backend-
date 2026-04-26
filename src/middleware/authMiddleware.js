const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    let token;

    // Check for token in cookies first, then in Authorization header
    if (req.cookies && req.cookies.token) {
        token = req.cookies.token;
    } else if (req.header('Authorization')?.startsWith('Bearer ')) {
        token = req.header('Authorization').replace('Bearer ', '');
    }

    if (!token) {
        return res.status(401).json({ message: 'No token, authorization denied' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ message: 'Token is not valid' });
    }
};
