# Testing Guide

This project uses **Jest** as the testing framework for unit tests.

## Running Tests

### Run all tests
```bash
npm test
```

### Run tests in watch mode (auto-rerun on file changes)
```bash
npm run test:watch
```

### Run tests with coverage report
```bash
npm run test:coverage
```

## Test Coverage

Current test coverage for `calculator.js`:
- **Statements**: 84.74%
- **Branches**: 81.25%
- **Functions**: 81.81%
- **Lines**: 84.21%

All coverage metrics meet the 80% threshold requirement.

## Test Structure

### Test Files
- `js/calculator.test.js` - Unit tests for the TaxCalculator class

### What's Tested

#### TaxCalculator Class
1. **Constructor** - Initialization with default values
2. **calculateTaxFromBrackets()** - Progressive tax bracket calculations
   - Single bracket income
   - Multi-bracket income
   - High income scenarios
   - Zero income edge case
3. **calculateFederalTax()** - Federal tax calculations for different filing statuses
   - Single filer
   - Married filing jointly
4. **calculateStateTax()** - State tax calculations
   - No income tax states (FL, TX)
   - Flat tax states (IL)
   - Progressive tax states (CA)
   - Unknown state codes
5. **calculate()** - Complete tax calculations
   - Combined federal and state taxes
   - Effective rate calculations
   - After-tax income
   - String to number conversion
   - Error handling for missing data
6. **getStates()** - State list retrieval and sorting
7. **getTaxYear()** - Tax year getter

## Test Data

Tests use mock data that mirrors the structure of the actual 2024 tax data:
- Federal brackets for single and married filing jointly
- State configurations for CA, FL, IL, and TX

## Coverage Threshold

The project enforces an 80% coverage threshold for:
- Statements
- Branches
- Functions
- Lines

Tests will fail if coverage drops below these thresholds.

## Adding New Tests

When adding new functionality to `calculator.js`:
1. Add corresponding test cases in `calculator.test.js`
2. Run `npm run test:coverage` to ensure coverage remains above 80%
3. Follow the existing test structure and naming conventions

## Future Testing Plans

- Add UI tests for `ui.js` (DOM manipulation and event handling)
- Add integration tests for data loading from JSON files
- Add end-to-end tests for complete user workflows
