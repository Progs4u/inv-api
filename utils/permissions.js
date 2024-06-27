// utils/permissions.js
const roles = {
    admin: ['read:any', 'create:any', 'update:any', 'delete:any'],
    manager: ['read:any', 'create:own', 'update:own'],
    user: ['read:own']
};

const canPerformAction = (role, action) => {
    return roles[role]?.includes(action);
};

module.exports = {
    roles,
    canPerformAction
};
