# Testing Guidelines

- All tests are in `test/` directory
- Use existing test patterns for new features
- Mock external API calls with nock
- Test both success and error scenarios
- Some responses vary with the time of day, so tests should cover that
