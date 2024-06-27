const {Schema, model} = require("../middlewares/db.connection") // import Schema & model

// User Schema
const UserSchema = new Schema({
    username: {type: String, unique: true, required: true},
    password: {type: String, required: true},
    token: {type: String},
    role: { type: String, default: 'user', enum: ['user', 'admin', 'manager'] },
    permissions: { type: [String], default: [] },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date } 
});

// Method to update permissions based on role
UserSchema.methods.updatePermissions = function () {
    const { roles } = require('../utils/permissions');
    this.permissions = roles[this.role] || [];
};

// Middleware to set default permissions after saving a new user
UserSchema.pre('save', function (next) {
    if (this.isNew) {
        this.updatePermissions();
    }
    next();
});

// User model
const User = model("User", UserSchema)

module.exports = User