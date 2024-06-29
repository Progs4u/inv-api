
require("dotenv").config(); // import dotenv
const { Router } = require('express'); // import express router
const { isLoggedIn } = require('../middlewares/global'); // import global middleware
const roleCheck = require('../middlewares/roleCheck'); // import role check middleware
const permissionCheck = require('../middlewares/permissionCheck'); // import permission check


const adminRouter = Router();

adminRouter.use(isLoggedIn);
adminRouter.use(roleCheck(['admin']));

adminRouter.get('/test', (req, res, next) => {
    next();
}, permissionCheck('read:any, write:any'), (req, res) => {
    res.json({ message: 'Welcome Admin!' });
});

adminRouter.get('/test2', permissionCheck('read:any'), (req, res) => {
    res.json({ message: 'Welcome Admin (2)!' });
});

// update any userobject with new role
adminRouter.post('/update-role', permissionCheck('update:any'), async (req, res) => {
    const { User } = req.context.models;
    const { username, role } = req.body;
    try {
        const updatedUser = await User.findOne({ username: username });
        if (!updatedUser) {
            throw new Error('User not found');
        }
        console.log("new role: " + role);
        updatedUser.role = role;
        updatedUser.updatePermissions();   
        
        const savedUser = await updatedUser.save();
        
        res.json({ message: 'User role updated successfully', user: savedUser });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete any user account
adminRouter.delete('/delete/:username', permissionCheck('delete:any'), async (req, res) => {
    const { User } = req.context.models;
    const { username } = req.params;
    try {
        const user = await User.findOneAndDelete({ username });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        console.log(`Admin deleted user ${username}`);
        res.status(200).json({ message: 'User account deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Something went wrong!' });
    }
});

// Update user information (except role)
adminRouter.put('/update-user', permissionCheck('update:any'), async (req, res) => {
    const { User } = req.context.models;
    const { username, updates } = req.body;
    try {
        const user = await User.findOneAndUpdate({ username: username }, updates, { new: true });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({ message: 'Username updated successfully', user });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// List all users
adminRouter.get('/list-users', permissionCheck('read:any'), async (req, res) => {
    const { User } = req.context.models;
    try {
        const users = await User.find({});
        res.json({ users });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add permission to user
adminRouter.post('/add-permission', permissionCheck('update:any'), async (req, res) => {
    const { User } = req.context.models;
    const { username, permission } = req.body;
    try {
        const user = await User.findOne({ username: username });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        if (!user.permissions.includes(permission)) {
            user.permissions.push(permission);
            await user.save();
        }
        res.status(200).json({ message: 'Permission added successfully', user });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Remove permission from user
adminRouter.post('/remove-permission', permissionCheck('update:any'), async (req, res) => {
    const { User } = req.context.models;
    const { username, permission } = req.body;
    try {
        const user = await User.findOne({ username: username });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        user.permissions = user.permissions.filter(perm => perm !== permission);
        await user.save();
        res.status(200).json({ message: 'Permission removed successfully', user });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


module.exports = adminRouter;
