
require("dotenv").config(); // import dotenv
const { Router } = require('express'); // import express router
const { isLoggedIn } = require('../middlewares/global'); // import global middleware
const roleCheck = require('../middlewares/roleCheck'); // import role check middleware
const permissionCheck = require('../middlewares/permissionCheck'); // import permission check
const { updateUserRole } = require('../services/userService');

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
    const { userId, newRole } = req.body;
    try {
        const updatedUser = await updateUserRole(userId, newRole);
        res.json({ message: 'User role updated successfully', user: updatedUser });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = adminRouter;
