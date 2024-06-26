## Design Decisions

### Authentication
- **JWT**: JSON Web Tokens are used for authenticating users and securing endpoints.
- **Role-based Access Control**: Ensures that only authorized users can access certain endpoints.

### Database
- **MongoDB**: Chosen for its flexibility in handling unstructured data and ease of scalability.
- **Mongoose**: Provides a straightforward schema-based solution to model application data.

### Security
- **HTTPS**: SSL/TLS is enforced for secure communication.
- **Environment Variables**: Sensitive data such as API keys and database credentials are stored in environment variables.

## Middleware

### Global Middleware
- **CORS**: Enables Cross-Origin Resource Sharing.
- **Body-Parser**: Parses incoming request bodies in a middleware before your handlers.

### Custom Middleware
- **createContext**: Attaches the context (models) to the request object.
- **isLoggedIn**: Verifies JWT and ensures the user is authenticated.
- **revokeToken**: Manages a blacklist of revoked tokens.

## Error Handling
Errors are caught and handled globally using middleware to ensure that the application does not crash and provides meaningful error messages to the client.

## Future Enhancements
- **Advanced Reporting**: Implement comprehensive reporting and analytics features.
- **Notification System**: Extend the notification system to support more events and user preferences.
- **Performance Optimization**: Further optimize the database queries and implement caching strategies.

inv-api/
├── controllers/ # Route handlers
│ └── User.js
├── middlewares/ # Express middlewares
│ ├── db.connection.js
│ └── global.js
├── models/ # Mongoose models
│ └── User.js
├── routes/ # API routes
├── services/ # Business logic
├── ssl/ # SSL certificates
├── tests/ # Test cases
├── utils/ # Utility functions
├── .env # Environment variables
├── README.md # Project documentation
├── server.js # Main server file
└── package.json # Project metadata and dependencies

## Design Decisions

### Authentication
- **JWT**: JSON Web Tokens are used for authenticating users and securing endpoints.
- **Role-based Access Control**: Ensures that only authorized users can access certain endpoints.

### Database
- **MongoDB**: Chosen for its flexibility in handling unstructured data and ease of scalability.
- **Mongoose**: Provides a straightforward schema-based solution to model application data.

### Security
- **HTTPS**: SSL/TLS is enforced for secure communication.
- **Environment Variables**: Sensitive data such as API keys and database credentials are stored in environment variables.

## Middleware

### Global Middleware
- **CORS**: Enables Cross-Origin Resource Sharing.
- **Body-Parser**: Parses incoming request bodies in a middleware before your handlers.

### Custom Middleware
- **createContext**: Attaches the context (models) to the request object.
- **isLoggedIn**: Verifies JWT and ensures the user is authenticated.
- **revokeToken**: Manages a blacklist of revoked tokens.

## Error Handling
Errors are caught and handled globally using middleware to ensure that the application does not crash and provides meaningful error messages to the client.

## Future Enhancements
- **Advanced Reporting**: Implement comprehensive reporting and analytics features.
- **Notification System**: Extend the notification system to support more events and user preferences.
- **Performance Optimization**: Further optimize the database queries and implement caching strategies.

