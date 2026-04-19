// UI Logic

let chart = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', async () => {
    await taxCalculator.init();
    populateStateDropdown();
    setupEventListeners();
    document.getElementById('taxYear').textContent = taxCalculator.getTaxYear();
});

function populateStateDropdown() {
    const stateSelect = document.getElementById('state');
    const states = taxCalculator.getStates();

    states.forEach(state => {
        const option = document.createElement('option');
        option.value = state.code;
        option.textContent = state.name;
        stateSelect.appendChild(option);
    });
}

function setupEventListeners() {
    const form = document.getElementById('taxForm');
    form.addEventListener('submit', handleFormSubmit);
}

function handleFormSubmit(event) {
    event.preventDefault();

    const income = document.getElementById('income').value;
    const filingStatus = document.getElementById('filingStatus').value;
    const stateCode = document.getElementById('state').value;

    try {
        const results = taxCalculator.calculate(income, filingStatus, stateCode);
        displayResults(results);
    } catch (error) {
        console.error('Calculation error:', error);
        alert('An error occurred while calculating taxes. Please try again.');
    }
}

function displayResults(results) {
    // Show results section
    document.getElementById('results').style.display = 'block';

    // Display summary numbers
    document.getElementById('totalTax').textContent = formatCurrency(results.totalTax);
    document.getElementById('effectiveRate').textContent = formatPercent(results.effectiveRate);
    document.getElementById('federalTax').textContent = formatCurrency(results.federal.totalTax);
    document.getElementById('stateTax').textContent = formatCurrency(results.state.totalTax);
    document.getElementById('afterTaxIncome').textContent = formatCurrency(results.afterTaxIncome);

    const federalEffectiveRate = (results.federal.totalTax / results.income) * 100;
    const stateEffectiveRate = (results.state.totalTax / results.income) * 100;

    document.getElementById('federalRate').textContent = formatPercent(federalEffectiveRate);
    document.getElementById('stateRate').textContent = formatPercent(stateEffectiveRate);

    // Display federal breakdown
    displayFederalBreakdown(results.federal.breakdown, results.income);

    // Display state breakdown
    if (results.state.type !== 'none') {
        document.getElementById('stateBreakdownSection').style.display = 'block';
        displayStateBreakdown(results.state.breakdown, results.income, results.state.type);
    } else {
        document.getElementById('stateBreakdownSection').style.display = 'none';
    }

    // Display chart
    displayChart(results);

    // Smooth scroll to results
    document.getElementById('results').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function displayFederalBreakdown(breakdown, totalIncome) {
    const container = document.getElementById('federalBreakdown');
    container.innerHTML = '';

    breakdown.forEach((item, index) => {
        const bracketDiv = document.createElement('div');
        bracketDiv.className = 'bracket-item';
        bracketDiv.style.setProperty('--bracket-index', index);

        const maxDisplay = item.max === Infinity ? '+' : formatCurrency(item.max, false);
        const percentOfIncome = (item.taxableAmount / totalIncome) * 100;

        bracketDiv.innerHTML = `
            <div class="bracket-header">
                <span class="bracket-range">
                    ${formatCurrency(item.min, false)} - ${maxDisplay}
                </span>
                <span class="bracket-rate">${formatPercent(item.rate * 100)}</span>
            </div>
            <div class="bracket-details">
                <div class="bracket-bar">
                    <div class="bracket-bar-fill" style="width: ${Math.min(percentOfIncome, 100)}%"></div>
                </div>
                <div class="bracket-amount">
                    ${formatCurrency(item.taxableAmount, false)} × ${formatPercent(item.rate * 100)} =
                    <strong>${formatCurrency(item.taxAmount)}</strong>
                </div>
            </div>
        `;

        container.appendChild(bracketDiv);
    });
}

function displayStateBreakdown(breakdown, totalIncome, type) {
    const container = document.getElementById('stateBreakdown');
    container.innerHTML = '';

    if (type === 'flat') {
        const item = breakdown[0];
        const bracketDiv = document.createElement('div');
        bracketDiv.className = 'bracket-item';

        bracketDiv.innerHTML = `
            <div class="bracket-header">
                <span class="bracket-range">Flat Rate</span>
                <span class="bracket-rate">${formatPercent(item.rate * 100)}</span>
            </div>
            <div class="bracket-details">
                <div class="bracket-amount">
                    ${formatCurrency(item.taxableAmount, false)} × ${formatPercent(item.rate * 100)} =
                    <strong>${formatCurrency(item.taxAmount)}</strong>
                </div>
            </div>
        `;

        container.appendChild(bracketDiv);
    } else {
        breakdown.forEach((item, index) => {
            const bracketDiv = document.createElement('div');
            bracketDiv.className = 'bracket-item';
            bracketDiv.style.setProperty('--bracket-index', index);

            const maxDisplay = item.max === Infinity ? '+' : formatCurrency(item.max, false);
            const percentOfIncome = (item.taxableAmount / totalIncome) * 100;

            bracketDiv.innerHTML = `
                <div class="bracket-header">
                    <span class="bracket-range">
                        ${formatCurrency(item.min, false)} - ${maxDisplay}
                    </span>
                    <span class="bracket-rate">${formatPercent(item.rate * 100)}</span>
                </div>
                <div class="bracket-details">
                    <div class="bracket-bar">
                        <div class="bracket-bar-fill" style="width: ${Math.min(percentOfIncome, 100)}%"></div>
                    </div>
                    <div class="bracket-amount">
                        ${formatCurrency(item.taxableAmount, false)} × ${formatPercent(item.rate * 100)} =
                        <strong>${formatCurrency(item.taxAmount)}</strong>
                    </div>
                </div>
            `;

            container.appendChild(bracketDiv);
        });
    }
}

function displayChart(results) {
    const ctx = document.getElementById('taxChart').getContext('2d');

    // Destroy previous chart if exists
    if (chart) {
        chart.destroy();
    }

    const data = {
        labels: ['After-Tax Income', 'Federal Tax', 'State Tax'],
        datasets: [{
            data: [
                results.afterTaxIncome,
                results.federal.totalTax,
                results.state.totalTax
            ],
            backgroundColor: [
                'rgba(52, 211, 153, 0.8)',
                'rgba(59, 130, 246, 0.8)',
                'rgba(147, 51, 234, 0.8)'
            ],
            borderColor: [
                'rgba(52, 211, 153, 1)',
                'rgba(59, 130, 246, 1)',
                'rgba(147, 51, 234, 1)'
            ],
            borderWidth: 2
        }]
    };

    chart = new Chart(ctx, {
        type: 'doughnut',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        font: {
                            size: 14,
                            family: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = formatCurrency(context.parsed);
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((context.parsed / total) * 100).toFixed(1);
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

function formatCurrency(amount, includeDecimals = true) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: includeDecimals ? 2 : 0,
        maximumFractionDigits: includeDecimals ? 2 : 0
    }).format(amount);
}

function formatPercent(value) {
    return value.toFixed(2) + '%';
}
