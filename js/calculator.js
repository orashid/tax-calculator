// Tax Calculator Logic

class TaxCalculator {
    constructor() {
        this.federalData = null;
        this.stateData = null;
        this.taxYear = 2024;
    }

    async init() {
        await this.loadTaxData();
    }

    async loadTaxData() {
        try {
            const [federalResponse, stateResponse] = await Promise.all([
                fetch(`data/${this.taxYear}/federal-brackets.json`),
                fetch(`data/${this.taxYear}/state-taxes.json`)
            ]);

            this.federalData = await federalResponse.json();
            this.stateData = await stateResponse.json();

            return true;
        } catch (error) {
            console.error('Error loading tax data:', error);
            return false;
        }
    }

    calculateTaxFromBrackets(income, brackets) {
        let totalTax = 0;
        const breakdown = [];

        for (let i = 0; i < brackets.length; i++) {
            const bracket = brackets[i];
            const bracketMin = bracket.min;
            const bracketMax = bracket.max || Infinity;

            if (income <= bracketMin) {
                break;
            }

            const taxableInBracket = Math.min(income, bracketMax) - bracketMin;

            if (taxableInBracket > 0) {
                const taxForBracket = taxableInBracket * bracket.rate;
                totalTax += taxForBracket;

                breakdown.push({
                    min: bracketMin,
                    max: bracketMax === null ? Infinity : bracketMax,
                    rate: bracket.rate,
                    taxableAmount: taxableInBracket,
                    taxAmount: taxForBracket
                });
            }
        }

        return { totalTax, breakdown };
    }

    calculateFederalTax(income, filingStatus) {
        const brackets = this.federalData.brackets[filingStatus];
        return this.calculateTaxFromBrackets(income, brackets);
    }

    calculateStateTax(income, stateCode, filingStatus) {
        const state = this.stateData.states[stateCode];

        if (!state) {
            return { totalTax: 0, breakdown: [], type: 'unknown' };
        }

        if (state.type === 'none') {
            return { totalTax: 0, breakdown: [], type: 'none' };
        }

        if (state.type === 'flat') {
            const totalTax = income * state.rate;
            return {
                totalTax,
                breakdown: [{
                    rate: state.rate,
                    taxableAmount: income,
                    taxAmount: totalTax
                }],
                type: 'flat'
            };
        }

        if (state.type === 'progressive') {
            // Use filing status specific brackets if available, otherwise use single brackets
            let brackets = state.brackets[filingStatus] || state.brackets.single;
            const result = this.calculateTaxFromBrackets(income, brackets);
            return { ...result, type: 'progressive' };
        }

        return { totalTax: 0, breakdown: [], type: 'unknown' };
    }

    calculate(income, filingStatus, stateCode) {
        income = parseFloat(income);

        if (!this.federalData || !this.stateData) {
            throw new Error('Tax data not loaded');
        }

        const federal = this.calculateFederalTax(income, filingStatus);
        const state = this.calculateStateTax(income, stateCode, filingStatus);

        const totalTax = federal.totalTax + state.totalTax;
        const effectiveRate = income > 0 ? (totalTax / income) * 100 : 0;
        const afterTaxIncome = income - totalTax;

        return {
            income,
            federal,
            state,
            totalTax,
            effectiveRate,
            afterTaxIncome,
            filingStatus,
            stateCode,
            stateName: this.stateData.states[stateCode]?.name || 'Unknown'
        };
    }

    getStates() {
        if (!this.stateData) return [];

        return Object.entries(this.stateData.states)
            .map(([code, data]) => ({
                code,
                name: data.name
            }))
            .sort((a, b) => a.name.localeCompare(b.name));
    }

    getTaxYear() {
        return this.taxYear;
    }
}

// Create global instance
const taxCalculator = new TaxCalculator();

// Export for testing (Node.js environment)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TaxCalculator };
}
