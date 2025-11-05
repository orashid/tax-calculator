const { TaxCalculator } = require('./calculator.js');

// Mock tax data for testing
const mockFederalData = {
    year: 2024,
    standardDeduction: {
        single: 14600,
        marriedJoint: 29200,
        marriedSeparate: 14600,
        headOfHousehold: 21900
    },
    brackets: {
        single: [
            { min: 0, max: 11600, rate: 0.10 },
            { min: 11600, max: 47150, rate: 0.12 },
            { min: 47150, max: 100525, rate: 0.22 },
            { min: 100525, max: 191950, rate: 0.24 },
            { min: 191950, max: 243725, rate: 0.32 },
            { min: 243725, max: 609350, rate: 0.35 },
            { min: 609350, max: null, rate: 0.37 }
        ],
        marriedJoint: [
            { min: 0, max: 23200, rate: 0.10 },
            { min: 23200, max: 94300, rate: 0.12 },
            { min: 94300, max: 201050, rate: 0.22 },
            { min: 201050, max: 383900, rate: 0.24 },
            { min: 383900, max: 487450, rate: 0.32 },
            { min: 487450, max: 731200, rate: 0.35 },
            { min: 731200, max: null, rate: 0.37 }
        ]
    }
};

const mockStateData = {
    year: 2024,
    states: {
        CA: {
            name: 'California',
            type: 'progressive',
            brackets: {
                single: [
                    { min: 0, max: 10412, rate: 0.01 },
                    { min: 10412, max: 24684, rate: 0.02 },
                    { min: 24684, max: 38959, rate: 0.04 },
                    { min: 38959, max: 54081, rate: 0.06 },
                    { min: 54081, max: 68350, rate: 0.08 },
                    { min: 68350, max: 349137, rate: 0.093 }
                ]
            }
        },
        FL: {
            name: 'Florida',
            type: 'none'
        },
        IL: {
            name: 'Illinois',
            type: 'flat',
            rate: 0.0495
        },
        TX: {
            name: 'Texas',
            type: 'none'
        }
    }
};

describe('TaxCalculator', () => {
    let calculator;

    beforeEach(() => {
        calculator = new TaxCalculator();
        calculator.federalData = mockFederalData;
        calculator.stateData = mockStateData;
    });

    describe('Constructor', () => {
        test('should initialize with null data and 2024 tax year', () => {
            const newCalc = new TaxCalculator();
            expect(newCalc.federalData).toBeNull();
            expect(newCalc.stateData).toBeNull();
            expect(newCalc.taxYear).toBe(2024);
        });
    });

    describe('calculateTaxFromBrackets', () => {
        test('should calculate tax correctly for income in first bracket', () => {
            const income = 10000;
            const brackets = mockFederalData.brackets.single;
            const result = calculator.calculateTaxFromBrackets(income, brackets);

            expect(result.totalTax).toBe(1000); // 10000 * 0.10
            expect(result.breakdown).toHaveLength(1);
            expect(result.breakdown[0].rate).toBe(0.10);
        });

        test('should calculate tax correctly for income spanning multiple brackets', () => {
            const income = 50000;
            const brackets = mockFederalData.brackets.single;
            const result = calculator.calculateTaxFromBrackets(income, brackets);

            // First bracket: 11600 * 0.10 = 1160
            // Second bracket: (47150 - 11600) * 0.12 = 4266
            // Third bracket: (50000 - 47150) * 0.22 = 627
            // Total: 1160 + 4266 + 627 = 6053
            expect(result.totalTax).toBeCloseTo(6053, 2);
            expect(result.breakdown).toHaveLength(3);
        });

        test('should calculate tax correctly for high income', () => {
            const income = 1000000;
            const brackets = mockFederalData.brackets.single;
            const result = calculator.calculateTaxFromBrackets(income, brackets);

            expect(result.totalTax).toBeGreaterThan(0);
            expect(result.breakdown.length).toBeGreaterThan(0);
        });

        test('should handle zero income', () => {
            const income = 0;
            const brackets = mockFederalData.brackets.single;
            const result = calculator.calculateTaxFromBrackets(income, brackets);

            expect(result.totalTax).toBe(0);
            expect(result.breakdown).toHaveLength(0);
        });
    });

    describe('calculateFederalTax', () => {
        test('should calculate federal tax for single filer', () => {
            const income = 75000;
            const result = calculator.calculateFederalTax(income, 'single');

            expect(result.totalTax).toBeGreaterThan(0);
            expect(result.breakdown).toBeDefined();
            expect(result.breakdown.length).toBeGreaterThan(0);
        });

        test('should calculate federal tax for married filing jointly', () => {
            const income = 150000;
            const result = calculator.calculateFederalTax(income, 'marriedJoint');

            expect(result.totalTax).toBeGreaterThan(0);
            expect(result.breakdown).toBeDefined();
        });
    });

    describe('calculateStateTax', () => {
        test('should calculate tax for state with no income tax', () => {
            const income = 75000;
            const result = calculator.calculateStateTax(income, 'FL', 'single');

            expect(result.totalTax).toBe(0);
            expect(result.type).toBe('none');
            expect(result.breakdown).toHaveLength(0);
        });

        test('should calculate tax for state with flat tax', () => {
            const income = 100000;
            const result = calculator.calculateStateTax(income, 'IL', 'single');

            expect(result.totalTax).toBe(4950); // 100000 * 0.0495
            expect(result.type).toBe('flat');
            expect(result.breakdown).toHaveLength(1);
            expect(result.breakdown[0].rate).toBe(0.0495);
        });

        test('should calculate tax for state with progressive tax', () => {
            const income = 50000;
            const result = calculator.calculateStateTax(income, 'CA', 'single');

            expect(result.totalTax).toBeGreaterThan(0);
            expect(result.type).toBe('progressive');
            expect(result.breakdown.length).toBeGreaterThan(0);
        });

        test('should handle unknown state code', () => {
            const income = 75000;
            const result = calculator.calculateStateTax(income, 'XX', 'single');

            expect(result.totalTax).toBe(0);
            expect(result.type).toBe('unknown');
        });
    });

    describe('calculate', () => {
        test('should throw error when data not loaded', () => {
            const newCalc = new TaxCalculator();
            expect(() => {
                newCalc.calculate(75000, 'single', 'CA');
            }).toThrow('Tax data not loaded');
        });

        test('should calculate complete tax for single filer in California', () => {
            const income = 75000;
            const result = calculator.calculate(income, 'single', 'CA');

            expect(result.income).toBe(income);
            expect(result.federal.totalTax).toBeGreaterThan(0);
            expect(result.state.totalTax).toBeGreaterThan(0);
            expect(result.totalTax).toBe(result.federal.totalTax + result.state.totalTax);
            expect(result.effectiveRate).toBeGreaterThan(0);
            expect(result.afterTaxIncome).toBe(income - result.totalTax);
            expect(result.filingStatus).toBe('single');
            expect(result.stateCode).toBe('CA');
            expect(result.stateName).toBe('California');
        });

        test('should calculate complete tax for married couple in Texas', () => {
            const income = 150000;
            const result = calculator.calculate(income, 'marriedJoint', 'TX');

            expect(result.income).toBe(income);
            expect(result.federal.totalTax).toBeGreaterThan(0);
            expect(result.state.totalTax).toBe(0); // Texas has no state income tax
            expect(result.totalTax).toBe(result.federal.totalTax);
            expect(result.stateName).toBe('Texas');
        });

        test('should handle string income input', () => {
            const result = calculator.calculate('100000', 'single', 'FL');

            expect(result.income).toBe(100000);
            expect(result.totalTax).toBeGreaterThan(0);
        });

        test('should calculate zero effective rate for zero income', () => {
            const result = calculator.calculate(0, 'single', 'CA');

            expect(result.effectiveRate).toBe(0);
            expect(result.totalTax).toBe(0);
        });
    });

    describe('getStates', () => {
        test('should return sorted list of states', () => {
            const states = calculator.getStates();

            expect(states).toBeInstanceOf(Array);
            expect(states.length).toBeGreaterThan(0);
            expect(states[0]).toHaveProperty('code');
            expect(states[0]).toHaveProperty('name');

            // Check if sorted alphabetically by name
            for (let i = 1; i < states.length; i++) {
                expect(states[i].name >= states[i - 1].name).toBe(true);
            }
        });

        test('should return empty array when state data not loaded', () => {
            const newCalc = new TaxCalculator();
            expect(newCalc.getStates()).toEqual([]);
        });
    });

    describe('getTaxYear', () => {
        test('should return 2024', () => {
            expect(calculator.getTaxYear()).toBe(2024);
        });
    });
});
