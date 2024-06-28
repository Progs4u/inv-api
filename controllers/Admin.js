
require("dotenv").config(); // import dotenv
const { Router } = require('express'); // import express router
const { isLoggedIn } = require('../middlewares/global'); // import global middleware
const roleCheck = require('../middlewares/roleCheck'); // import role check middleware
const permissionCheck = require('../middlewares/permissionCheck'); // import permission check


const adminRouter = Router();

adminRouter.use(isLoggedIn);
adminRouter.use(roleCheck(['admin']));

adminRouter.get('/test', (req, res, next) => {
    console.log('User object:', req.user);
    next();
}, permissionCheck('read:any'), (req, res) => {
    res.json({ message: 'Welcome Admin!' });
});

adminRouter.get('/test2', permissionCheck('read:any'), (req, res) => {
    res.json({ message: 'Welcome Admin (2)!' });
});

// update any userobject with new role
adminRouter.post('/update-role', permissionCheck('update:any'), async (req, res) => {
    const { User } = req.context.models;
    const { username, role } = req.body;
    console.log(req.body);
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


module.exports = adminRouter;
