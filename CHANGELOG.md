# Changelog

## [1.0.0] - 2024-06-26
### Added
- Initial release of the Inventory Management System API.
- User registration and login endpoints.
- Role-based access control.
- Basic inventory management endpoints.

## [1.1.0] - 2024-06-27
### Added
- Admin route for managing users.
- Enhanced error handling middleware.
- Rate limiting on login and token refresh endpoints to prevent brute-force attacks.

### Changed
- Improved security with token revocation and blacklist functionality.
- Updated middleware for role-based access control.

### Fixed
- General bug fixes and improvements in user authentication and error handling.

## [1.2.0] - 2024-06-27
### Added
- Password reset functionality for users.
- New routes for requesting password reset and resetting password using a token.

### Changed
- Updated documentation to reflect new password reset features.

### Fixed
- Minor bugs related to user authentication and session management.
