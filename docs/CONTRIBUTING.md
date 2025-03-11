# Contributing to Running Training Platform

## Development Setup

### Prerequisites
- Node.js 20 or higher
- PostgreSQL 16
- Strava API credentials
- Gemini AI API key

### Environment Setup
1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
# Database
DATABASE_URL=postgresql://...
PGUSER=...
PGHOST=...
PGPASSWORD=...
PGPORT=...
PGDATABASE=...

# API Keys
GEMINI_API_KEY=...
STRAVA_CLIENT_ID=...
STRAVA_CLIENT_SECRET=...
```

### Development Workflow
1. Start the development server:
```bash
npm run dev
```

2. Make your changes
3. Test your changes:
```bash
npm test
```

4. Submit a pull request

## Code Style Guidelines
- Use TypeScript for type safety
- Follow ESLint configuration
- Write unit tests for new features
- Use semantic HTML and accessible components
- Follow React hooks best practices

## Testing
- Write unit tests for utility functions and hooks
- Write integration tests for API endpoints
- Test UI components using React Testing Library

## Documentation
- Document new features in the appropriate docs/ subdirectory
- Update API documentation for new endpoints
- Include JSDoc comments for TypeScript interfaces and functions

## Commit Message Format
Follow conventional commits:
- feat: New feature
- fix: Bug fix
- docs: Documentation changes
- style: Code style changes
- refactor: Code refactoring
- test: Test updates
- chore: Maintenance tasks
