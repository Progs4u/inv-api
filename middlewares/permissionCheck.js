// middlewares/permissionCheck.js
const { canPerformAction } = require('../utils/permissions');

const permissionCheck = (action) => {
    return (req, res, next) => {
        const { role } = req.user;
        console.log(`Checking permission for role: ${role}, action: ${action}`);
        if (canPerformAction(role, action)) {
            console.log('Permission granted');
            return next();
        }
        console.log('Permission denied');
        return res.status(403).json({ error: 'Access denied. You do not have permission to perform this action.' });
    };
};

module.exports = permissionCheck;
