## Design Decisions

### Authentication
- **JWT**: JSON Web Tokens are used for authenticating users and securing endpoints.
- **Role-based Access Control**: Ensures that only authorized users can access certain endpoints.
- **Password Reset**: Secure password reset functionality using tokens.

### Database
- **MongoDB**: Chosen for its flexibility in handling unstructured data and ease of scalability.
- **Mongoose**: Provides a straightforward schema-based solution to model application data.

### Security
- **HTTPS**: SSL/TLS is enforced for secure communication.
- **Environment Variables**: Sensitive data such as API keys and database credentials are stored in environment variables.
- **Rate Limiting**: Implemented to prevent brute-force attacks on login and token refresh endpoints.

### Middleware

#### Global Middleware
- **CORS**: Enables Cross-Origin Resource Sharing.
- **Body-Parser**: Parses incoming request bodies in a middleware before your handlers.
- **Context Creation**: Attaches the context (models) to the request object.

#### Custom Middleware
- **isLoggedIn**: Verifies JWT and ensures the user is authenticated.
- **revokeToken**: Manages a blacklist of revoked tokens.
- **roleCheck**: Restricts access based on user roles.

### Models
- **User**: Handles user information including username, password, role, and tokens.
- **Inventory Item**: (Planned) Manages inventory items with fields for name, category, quantity, and other relevant details.
- **Category**: (Planned) Organizes inventory items into categories for easier management.

### Routes
- **User Routes**: Handles user authentication, registration, and password reset.
- **Admin Routes**: Allows admin users to manage other users and view system statistics.
- **Inventory Routes**: (Planned) Manages CRUD operations for inventory items and categories.

### Error Handling
Errors are caught and handled globally using middleware to ensure that the application does not crash and provides meaningful error messages to the client.

### Future Enhancements
- **Advanced Reporting**: Implement comprehensive reporting and analytics features.
- **Notification System**: Extend the notification system to support more events and user preferences.
- **Performance Optimization**: Further optimize the database queries and implement caching strategies.
