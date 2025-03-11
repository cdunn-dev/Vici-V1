# Running Training Platform Architecture

## System Overview
The Running Training Platform is a full-stack web application that provides personalized training plans and workout tracking for runners.

## Architecture Diagram
```
+----------------+     +-----------------+     +------------------+
|                |     |                 |     |                  |
|  React Frontend|<--->| Express Backend |<--->| PostgreSQL DB   |
|                |     |                 |     |                  |
+----------------+     +-----------------+     +------------------+
        ^                      ^                       ^
        |                      |                       |
        v                      v                       v
+----------------+     +-----------------+     +------------------+
| Strava API     |     | Gemini AI       |     | Training Data   |
| Integration    |     | Integration     |     | Processing      |
+----------------+     +-----------------+     +------------------+
```

## Key Components

### Frontend Architecture
- React with TypeScript for type safety
- TanStack Query for data fetching and caching
- Shadcn UI components for consistent design
- Responsive layout using Tailwind CSS
- Client-side form validation with Zod

### Backend Architecture
- Express.js server with TypeScript
- RESTful API endpoints
- PostgreSQL database with Drizzle ORM
- Session-based authentication
- Rate limiting and security middleware

### Data Models
- Users and authentication
- Training plans and workouts
- Activity tracking and metrics
- Integration with Strava activities

### AI Integration
- Gemini AI for training plan generation
- Adaptive workout adjustments
- Natural language processing for feedback

### External Integrations
- Strava API for activity sync
- OAuth2 authentication flow
- Webhook listeners for real-time updates

## Security Considerations
- HTTPS-only communication
- Secure session management
- API key rotation
- Input validation and sanitization
- CORS configuration
- Rate limiting

## Performance Optimizations
- React Query caching
- Database indexing
- Lazy loading of components
- Image optimization
- API response compression

## Deployment
- Hosted on Replit
- Automatic deployments
- Database backups
- Error monitoring and logging
- Performance monitoring
