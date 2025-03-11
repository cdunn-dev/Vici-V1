# Integration Tests

This directory contains integration tests that verify the interaction between different parts of the application.

## Structure

- `api/` - API endpoint integration tests
- `workflows/` - End-to-end workflow tests
- `auth/` - Authentication flow tests
- `strava/` - Strava integration tests

## Running Tests

```bash
npm run test:integration
```

## Guidelines

- Test complete user workflows
- Verify API integrations
- Test database interactions
- Check authentication flows
- Validate third-party integrations
