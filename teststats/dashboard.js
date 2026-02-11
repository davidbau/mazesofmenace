// Test Dashboard Logic
// Loads results.jsonl and visualizes test history

let testData = [];
let timelineChart = null;
let categoryChart = null;

// Load and parse JSONL file
async function loadTestData() {
    try {
        const response = await fetch('results.jsonl');
        const text = await response.text();

        // Parse JSONL (one JSON object per line)
        testData = text
            .trim()
            .split('\n')
            .filter(line => line.trim())
            .map(line => JSON.parse(line))
            .sort((a, b) => new Date(a.date) - new Date(b.date)); // Sort chronologically

        console.log(`Loaded ${testData.length} test results`);
        renderDashboard();
    } catch (error) {
        console.error('Error loading test data:', error);
        document.getElementById('latest-commit').textContent = 'Error loading data';
    }
}

// Render all dashboard components
function renderDashboard() {
    if (testData.length === 0) {
        document.getElementById('latest-commit').textContent = 'No data available';
        return;
    }

    const latest = testData[testData.length - 1];

    // Update summary cards
    renderSummaryCards(latest);

    // Render timeline chart
    renderTimelineChart();

    // Render category chart
    renderCategoryChart(latest);

    // Render commits table
    renderCommitsTable();

    // Setup scrubber
    setupScrubber();

    // Update last updated timestamp
    document.getElementById('last-updated').textContent = new Date().toLocaleString();
}

// Render summary cards
function renderSummaryCards(latest) {
    document.getElementById('latest-commit').textContent = latest.commit;
    document.getElementById('latest-message').textContent = latest.message;

    document.getElementById('total-tests').textContent = latest.stats.total;
    document.getElementById('pass-count').textContent = latest.stats.pass;
    document.getElementById('fail-count').textContent = latest.stats.fail;

    const passPercent = ((latest.stats.pass / latest.stats.total) * 100).toFixed(1);
    const failPercent = ((latest.stats.fail / latest.stats.total) * 100).toFixed(1);

    document.getElementById('pass-percent').textContent = `${passPercent}%`;
    document.getElementById('fail-percent').textContent = `${failPercent}%`;

    if (latest.newTests !== 0) {
        const sign = latest.newTests > 0 ? '+' : '';
        document.getElementById('new-tests').textContent = `${sign}${latest.newTests} new`;
    }

    // Regression card
    const regressionCount = testData.filter(d => d.regression).length;
    document.getElementById('regression-count').textContent = regressionCount;

    if (latest.regression) {
        document.getElementById('regression-card').classList.add('regression');
        document.getElementById('regression-detail').textContent = 'Latest commit regressed';
    } else {
        document.getElementById('regression-detail').textContent = 'Last 10 commits';
    }
}

// Render timeline chart
function renderTimelineChart() {
    const ctx = document.getElementById('timeline-chart').getContext('2d');

    const labels = testData.map(d => {
        const date = new Date(d.date);
        return `${d.commit.substring(0, 7)} (${date.toLocaleDateString()})`;
    });

    const passData = testData.map(d => d.stats.pass);
    const failData = testData.map(d => d.stats.fail);
    const totalData = testData.map(d => d.stats.total);

    if (timelineChart) {
        timelineChart.destroy();
    }

    timelineChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Passing',
                    data: passData,
                    borderColor: '#4caf50',
                    backgroundColor: 'rgba(76, 175, 80, 0.1)',
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Failing',
                    data: failData,
                    borderColor: '#f44336',
                    backgroundColor: 'rgba(244, 67, 54, 0.1)',
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Total',
                    data: totalData,
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    borderDash: [5, 5],
                    fill: false,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    position: 'top'
                },
                title: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        footer: function(context) {
                            const index = context[0].dataIndex;
                            const data = testData[index];
                            return `Author: ${data.author}\nMessage: ${data.message}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Test Count'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Commit'
                    }
                }
            }
        }
    });
}

// Render category chart
function renderCategoryChart(latest) {
    const ctx = document.getElementById('category-chart').getContext('2d');

    const categories = latest.categories || {};
    const labels = Object.keys(categories);
    const passData = labels.map(cat => categories[cat].pass);
    const failData = labels.map(cat => categories[cat].fail);

    if (categoryChart) {
        categoryChart.destroy();
    }

    categoryChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Passing',
                    data: passData,
                    backgroundColor: '#4caf50'
                },
                {
                    label: 'Failing',
                    data: failData,
                    backgroundColor: '#f44336'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top'
                }
            },
            scales: {
                x: {
                    stacked: true,
                    title: {
                        display: true,
                        text: 'Test Category'
                    }
                },
                y: {
                    stacked: true,
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Test Count'
                    }
                }
            }
        }
    });
}

// Render commits table
function renderCommitsTable() {
    const tbody = document.getElementById('commits-tbody');
    tbody.innerHTML = '';

    // Show last 20 commits by default
    const recentData = testData.slice(-20).reverse();

    recentData.forEach((commit, index) => {
        const row = document.createElement('tr');

        // Determine if regression or improvement
        if (commit.regression) {
            row.classList.add('regression-row');
        }

        // Calculate delta from previous commit
        const prevIndex = testData.length - 1 - index - 1;
        let delta = 0;
        let deltaClass = 'delta-neutral';
        if (prevIndex >= 0) {
            const prev = testData[prevIndex];
            delta = commit.stats.pass - prev.stats.pass;
            deltaClass = delta > 0 ? 'delta-positive' : delta < 0 ? 'delta-negative' : 'delta-neutral';
        }

        const deltaText = delta > 0 ? `+${delta}` : delta < 0 ? delta : '–';

        const date = new Date(commit.date).toLocaleString();
        const passPercent = ((commit.stats.pass / commit.stats.total) * 100).toFixed(1);

        row.innerHTML = `
            <td><span class="commit-hash">${commit.commit}</span></td>
            <td>${date}</td>
            <td>${commit.author}</td>
            <td>${commit.message}</td>
            <td>${commit.stats.total}</td>
            <td>${commit.stats.pass}</td>
            <td>${commit.stats.fail}</td>
            <td>${passPercent}%</td>
            <td><span class="${deltaClass}">${deltaText}</span></td>
        `;

        tbody.appendChild(row);
    });
}

// Setup scrubber
function setupScrubber() {
    const scrubber = document.getElementById('commit-scrubber');
    const scrubberInfo = document.getElementById('scrubber-info');

    scrubber.max = testData.length - 1;
    scrubber.value = testData.length - 1;

    scrubber.addEventListener('input', (e) => {
        const index = parseInt(e.target.value);
        const commit = testData[index];

        if (commit) {
            const date = new Date(commit.date).toLocaleDateString();
            const passPercent = ((commit.stats.pass / commit.stats.total) * 100).toFixed(1);

            scrubberInfo.textContent = `${commit.commit}: ${commit.stats.pass}/${commit.stats.total} (${passPercent}%) - ${commit.message} (${date})`;

            // Optionally update charts to show historical view
            // This could be enhanced to show state at that point in time
        }
    });

    // Trigger initial display
    scrubber.dispatchEvent(new Event('input'));
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
    loadTestData();
});
