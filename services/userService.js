// services/userService.js
const { User } = require('../models/User');

const updateUserRole = async (userId, newRole) => {
    try {
        const user = await User.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }
        user.role = newRole;
        user.updatePermissions();
        await user.save();
        return user;
    } catch (error) {
        throw new Error(`Error updating user role: ${error.message}`);
    }
};

module.exports = {
    updateUserRole,
};
