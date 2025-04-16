document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const algo1 = urlParams.get('algo1');
    const algo2 = urlParams.get('algo2');
    const formData = new FormData();

    // Populate formData with query parameters (excluding algo1 and algo2)
    for (const [key, value] of urlParams.entries()) {
        if (key !== 'algo1' && key !== 'algo2') {
            formData.append(key, value);
        }
    }

    const algo1Title = document.getElementById('algo1-title');
    const algo2Title = document.getElementById('algo2-title');
    const ganttChart1 = document.getElementById('gantt-chart-1');
    const ganttChart2 = document.getElementById('gantt-chart-2');
    const comparisonTable = document.getElementById('comparison-table');
    const keyDifferencesTable = document.getElementById('key-differences-table');
    const calcTimeComparison = document.getElementById('calc-time-comparison');
    const bettermentText = document.getElementById('betterment-text');

    let charts = {};

    // Set titles
    algo1Title.textContent = `${algo1} Gantt Chart`;
    algo2Title.textContent = `${algo2} Gantt Chart`;

    // Fetch data for both algorithms
    const fetchData = (algo) => {
        formData.set('algo', algo);
        return fetch('/', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(err => { throw new Error(err.error); });
            }
            return response.json();
        });
    };

    // Destroy existing charts
    function destroyCharts() {
        Object.values(charts).forEach(chart => {
            if (chart) chart.destroy();
        });
        charts = {};
    }

    Promise.all([fetchData(algo1), fetchData(algo2)])
        .then(([data1, data2]) => {
            // Gantt Charts
            const renderGanttChart = (ganttChart, timeline) => {
                ganttChart.innerHTML = '';
                timeline.forEach(([name, start, end], index) => {
                    if (index < 100) {
                        const block = document.createElement('div');
                        block.className = 'gantt-block';
                        block.style.width = `${Math.max((end - start) * 80, 20)}px`;
                        block.innerHTML = `${name}<br>(${start}-${end})`;
                        ganttChart.appendChild(block);
                        block.style.animationDelay = `${index * 0.5}s`;
                    }
                });
            };

            renderGanttChart(ganttChart1, data1.timeline);
            renderGanttChart(ganttChart2, data2.timeline);

            // Comparison Details Table
            let tableHTML = '<table><tr><th>Process</th>';
            tableHTML += `<th>${algo1} CT</th><th>${algo1} TAT</th><th>${algo1} WT</th>`;
            tableHTML += `<th>${algo2} CT</th><th>${algo2} TAT</th><th>${algo2} WT</th></tr>`;
            data1.metrics.forEach((m1, index) => {
                const m2 = data2.metrics[index];
                tableHTML += `<tr><td>${m1.name}</td>`;
                tableHTML += `<td>${m1.ct}</td><td>${m1.tat}</td><td>${m1.wt}</td>`;
                tableHTML += `<td>${m2.ct}</td><td>${m2.tat}</td><td>${m2.wt}</td></tr>`;
            });
            tableHTML += '</table>';
            comparisonTable.innerHTML = tableHTML;

            // Key Differences Table
            const getAlgorithmTraits = (algo) => {
                switch (algo) {
                    case "FCFS Non-Preemptive":
                        return {
                            approach: "First-Come, First-Served",
                            preemption: "No",
                            fairness: "Poor (convoy effect)",
                            issues: "Long waiting times for short processes behind long ones"
                        };
                    case "FCFS Preemptive":
                        return {
                            approach: "First-Come, First-Served with time slicing",
                            preemption: "Yes",
                            fairness: "Moderate",
                            issues: "Context-switching overhead"
                        };
                    case "SJF Non-Preemptive":
                        return {
                            approach: "Shortest Job First",
                            preemption: "No",
                            fairness: "Poor (starvation risk)",
                            issues: "Requires burst time prediction"
                        };
                    case "SRTF":
                        return {
                            approach: "Shortest Remaining Time First",
                            preemption: "Yes",
                            fairness: "Poor (starvation risk)",
                            issues: "High context-switching overhead"
                        };
                    case "RR Non-Preemptive":
                        return {
                            approach: "Round Robin",
                            preemption: "No within quantum",
                            fairness: "Good",
                            issues: "Larger waiting times for long processes"
                        };
                    case "RR Preemptive":
                        return {
                            approach: "Round Robin",
                            preemption: "Yes",
                            fairness: "Good",
                            issues: "Context-switching overhead with small quantum"
                        };
                    case "Priority Non-Preemptive":
                        return {
                            approach: "Priority-based",
                            preemption: "No",
                            fairness: "Poor (starvation risk)",
                            issues: "Low-priority processes may wait indefinitely"
                        };
                    case "Priority Preemptive":
                        return {
                            approach: "Priority-based",
                            preemption: "Yes",
                            fairness: "Poor (starvation risk)",
                            issues: "High context-switching overhead"
                        };
                    case "Multilevel Queue":
                        return {
                            approach: "Priority-based queues (Foreground: RR, Background: FCFS)",
                            preemption: "Yes in foreground",
                            fairness: "Moderate (background starvation)",
                            issues: "Background processes may wait if foreground is busy"
                        };
                    case "Multilevel Feedback Queue":
                        return {
                            approach: "Dynamic queues with feedback",
                            preemption: "Yes",
                            fairness: "Good (anti-starvation via feedback)",
                            issues: "Complex implementation"
                        };
                    default:
                        return {
                            approach: "Unknown",
                            preemption: "Unknown",
                            fairness: "Unknown",
                            issues: "Unknown"
                        };
                }
            };

            const traits1 = getAlgorithmTraits(algo1);
            const traits2 = getAlgorithmTraits(algo2);
            let keyDiffHTML = '<table><tr><th>Aspect</th><th>' + algo1 + '</th><th>' + algo2 + '</th></tr>';
            keyDiffHTML += `<tr><td>Scheduling Approach</td><td>${traits1.approach}</td><td>${traits2.approach}</td></tr>`;
            keyDiffHTML += `<tr><td>Preemption</td><td>${traits1.preemption}</td><td>${traits2.preemption}</td></tr>`;
            keyDiffHTML += `<tr><td>Fairness</td><td>${traits1.fairness}</td><td>${traits2.fairness}</td></tr>`;
            keyDiffHTML += `<tr><td>Potential Issues</td><td>${traits1.issues}</td><td>${traits2.issues}</td></tr>`;
            keyDiffHTML += '</table>';
            keyDifferencesTable.innerHTML = keyDiffHTML;

            // Calculated Time Comparison
            const avgTat1 = (data1.total_tat / data1.metrics.length).toFixed(2);
            const avgWt1 = (data1.total_wt / data1.metrics.length).toFixed(2);
            const avgTat2 = (data2.total_tat / data2.metrics.length).toFixed(2);
            const avgWt2 = (data2.total_wt / data2.metrics.length).toFixed(2);

            calcTimeComparison.innerHTML = `
                <div class="calc-time-item">
                    <h3>${algo1}</h3>
                    <div class="subtext bg-color1"><strong>Total Burst Time:</strong> ${data1.total_bt}</div>
                    <div class="subtext bg-color2"><strong>Total Turnaround Time:</strong> ${data1.total_tat}</div>
                    <div class="subtext bg-color3"><strong>Total Waiting Time:</strong> ${data1.total_wt}</div>
                    <div class="subtext bg-color4"><strong>Average Turnaround Time:</strong> ${avgTat1}</div>
                    <div class="subtext bg-color5"><strong>Average Waiting Time:</strong> ${avgWt1}</div>
                </div>
                <div class="calc-time-item">
                    <h3>${algo2}</h3>
                    <div class="subtext bg-color1"><strong>Total Burst Time:</strong> ${data2.total_bt}</div>
                    <div class="subtext bg-color2"><strong>Total Turnaround Time:</strong> ${data2.total_tat}</div>
                    <div class="subtext bg-color3"><strong>Total Waiting Time:</strong> ${data2.total_wt}</div>
                    <div class="subtext bg-color4"><strong>Average Turnaround Time:</strong> ${avgTat2}</div>
                    <div class="subtext bg-color5"><strong>Average Waiting Time:</strong> ${avgWt2}</div>
                </div>
            `;

            // Visual Comparison (Bar Charts and Line Graphs)
            const isMobile = window.innerWidth <= 800;
            const chartOptions = {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            font: {
                                size: isMobile ? 10 : 12
                            }
                        }
                    }
                },
                layout: {
                    padding: {
                        left: isMobile ? 40 : 20,
                        right: 20,
                        top: 10,
                        bottom: 10
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            font: {
                                size: isMobile ? 10 : 12
                            },
                            maxRotation: isMobile ? 45 : 0,
                            minRotation: isMobile ? 45 : 0
                        }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            font: {
                                size: isMobile ? 10 : 12
                            }
                        }
                    }
                }
            };

            destroyCharts();

            // Bar Charts with Two Distinct Colors
            charts['tat-comparison-chart'] = new Chart(document.getElementById('tat-comparison-chart'), {
                type: 'bar',
                data: {
                    labels: [algo1, algo2],
                    datasets: [{
                        label: 'Average Turnaround Time',
                        data: [avgTat1, avgTat2],
                        backgroundColor: ['#ff6384', '#36a2eb'],
                        borderColor: ['#ff6384', '#36a2eb'],
                        borderWidth: 1
                    }]
                },
                options: chartOptions
            });

            charts['wt-comparison-chart'] = new Chart(document.getElementById('wt-comparison-chart'), {
                type: 'bar',
                data: {
                    labels: [algo1, algo2],
                    datasets: [{
                        label: 'Average Waiting Time',
                        data: [avgWt1, avgWt2],
                        backgroundColor: ['#ff6384', '#36a2eb'],
                        borderColor: ['#ff6384', '#36a2eb'],
                        borderWidth: 1
                    }]
                },
                options: chartOptions
            });

            // Separate Line Graphs for TAT and WT
            charts['tat-line-chart'] = new Chart(document.getElementById('tat-line-chart'), {
                type: 'line',
                data: {
                    labels: [algo1, algo2],
                    datasets: [{
                        label: 'Average Turnaround Time',
                        data: [avgTat1, avgTat2],
                        borderColor: '#ff6384',
                        backgroundColor: '#ff6384',
                        fill: false,
                        tension: 0.1
                    }]
                },
                options: chartOptions
            });

            charts['wt-line-chart'] = new Chart(document.getElementById('wt-line-chart'), {
                type: 'line',
                data: {
                    labels: [algo1, algo2],
                    datasets: [{
                        label: 'Average Waiting Time',
                        data: [avgWt1, avgWt2],
                        borderColor: '#36a2eb',
                        backgroundColor: '#36a2eb',
                        fill: false,
                        tension: 0.1
                    }]
                },
                options: chartOptions
            });

            // Betterment Comparison - Pie Charts
            const pieChartOptions = {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            font: {
                                size: isMobile ? 10 : 12
                            }
                        }
                    }
                }
            };

            charts['tat-pie-chart'] = new Chart(document.getElementById('tat-pie-chart'), {
                type: 'pie',
                data: {
                    labels: [algo1, algo2],
                    datasets: [{
                        label: 'Average Turnaround Time Proportion',
                        data: [avgTat1, avgTat2],
                        backgroundColor: ['#ff6384', '#36a2eb']
                    }]
                },
                options: pieChartOptions
            });

            charts['wt-pie-chart'] = new Chart(document.getElementById('wt-pie-chart'), {
                type: 'pie',
                data: {
                    labels: [algo1, algo2],
                    datasets: [{
                        label: 'Average Waiting Time Proportion',
                        data: [avgWt1, avgWt2],
                        backgroundColor: ['#ff6384', '#36a2eb']
                    }]
                },
                options: pieChartOptions
            });

            // Betterment Comparison Text
            let betterment = '';
            if (parseFloat(avgTat1) < parseFloat(avgTat2) && parseFloat(avgWt1) < parseFloat(avgWt2)) {
                betterment = `${algo1} performs better overall with lower average turnaround time (${avgTat1} vs ${avgTat2}) and waiting time (${avgWt1} vs ${avgWt2}).`;
            } else if (parseFloat(avgTat2) < parseFloat(avgTat1) && parseFloat(avgWt2) < parseFloat(avgWt1)) {
                betterment = `${algo2} performs better overall with lower average turnaround time (${avgTat2} vs ${avgTat1}) and waiting time (${avgWt2} vs ${avgWt1}).`;
            } else {
                betterment = `Mixed results: `;
                if (parseFloat(avgTat1) < parseFloat(avgTat2)) {
                    betterment += `${algo1} has a better average turnaround time (${avgTat1} vs ${avgTat2}), `;
                } else {
                    betterment += `${algo2} has a better average turnaround time (${avgTat2} vs ${avgTat1}), `;
                }
                if (parseFloat(avgWt1) < parseFloat(avgWt2)) {
                    betterment += `while ${algo1} has a better average waiting time (${avgWt1} vs ${avgWt2}).`;
                } else {
                    betterment += `while ${algo2} has a better average waiting time (${avgWt2} vs ${avgWt1}).`;
                }
            }

            // Enhanced Betterment Text
            const tatDiff = Math.abs(avgTat1 - avgTat2).toFixed(2);
            const wtDiff = Math.abs(avgWt1 - avgWt2).toFixed(2);
            const tatImprovement = avgTat1 != 0 && avgTat2 != 0 ? ((Math.max(avgTat1, avgTat2) - Math.min(avgTat1, avgTat2)) / Math.max(avgTat1, avgTat2) * 100).toFixed(2) : 0;
            const wtImprovement = avgWt1 != 0 && avgWt2 != 0 ? ((Math.max(avgWt1, avgWt2) - Math.min(avgWt1, avgWt2)) / Math.max(avgWt1, avgWt2) * 100).toFixed(2) : 0;
            const betterTatAlgo = parseFloat(avgTat1) < parseFloat(avgTat2) ? algo1 : algo2;
            const betterWtAlgo = parseFloat(avgWt1) < parseFloat(avgWt2) ? algo1 : algo2;

            betterment += `<p><strong>Performance Details:</strong> ${betterTatAlgo} has a better average Turnaround Time (${betterTatAlgo === algo1 ? avgTat1 : avgTat2} vs ${betterTatAlgo === algo1 ? avgTat2 : avgTat1}), with a difference of ${tatDiff} units (${tatImprovement}% improvement). Meanwhile, ${betterWtAlgo} has a better average Waiting Time (${betterWtAlgo === algo1 ? avgWt1 : avgWt2} vs ${betterWtAlgo === algo1 ? avgWt2 : avgWt1}), with a difference of ${wtDiff} units (${wtImprovement}% improvement).</p>`;

            // Workload Recommendations
            betterment += `<p><strong>Workload Recommendations:</strong> `;
            if (algo1.includes("SJF") || algo1.includes("SRTF")) {
                betterment += `${algo1} is ideal for workloads with predictable, short burst times (e.g., batch processing), but may struggle with I/O-bound tasks due to potential starvation. `;
            } else if (algo1.includes("RR") || algo1.includes("Multilevel")) {
                betterment += `${algo1} suits interactive systems with I/O-bound processes (e.g., time-sharing environments), offering better fairness and responsiveness. `;
            } else if (algo1.includes("Priority")) {
                betterment += `${algo1} is best for systems with critical tasks needing immediate attention (e.g., real-time systems), but requires careful priority management to avoid starvation. `;
            } else {
                betterment += `${algo1} works well for simple, sequential workloads (e.g., basic batch jobs), but may not handle mixed workloads efficiently. `;
            }

            if (algo2.includes("SJF") || algo2.includes("SRTF")) {
                betterment += `${algo2} excels in environments with short, predictable jobs (e.g., batch processing), but risks starving longer tasks in I/O-heavy systems.`;
            } else if (algo2.includes("RR") || algo2.includes("Multilevel")) {
                betterment += `${algo2} is better for interactive, I/O-bound workloads (e.g., user-facing applications), ensuring fairness and quick response times.`;
            } else if (algo2.includes("Priority")) {
                betterment += `${algo2} fits systems with prioritized tasks (e.g., real-time applications), but needs mechanisms to prevent low-priority process delays.`;
            } else {
                betterment += `${algo2} is suitable for straightforward, sequential workloads (e.g., simple batch processing), but may lead to delays in diverse systems.`;
            }
            betterment += `</p>`;

            // Algorithm-Specific Traits for Differentiation
            betterment += `<p><strong>Additional Considerations:</strong> Even if numerical results are similar, algorithm traits differ significantly. <br><br>`;
            betterment += `<strong>${algo1}</strong> has the following characteristics: <br>&emsp; 1.${traits1.issues}. <br>Its preemption policy (${traits1.preemption}) impacts context-switching overhead, which can affect performance in high-frequency task-switching scenarios.<br><br>`;
            betterment += `<strong>${algo2}</strong>, on the other hand, faces these challenges: <br>&emsp; 1.${traits2.issues}. <br>Its preemption policy (${traits2.preemption}) influences responsiveness and system overhead differently. <br><br>`;
            betterment += `<strong>For example</strong>, in a system with frequent arrivals, preemptive algorithms may incur more context switches, while non-preemptive ones might cause delays. Choose based on your system's task arrival patterns, process mix, and performance goals (e.g., minimizing TAT for batch jobs or WT for interactive tasks).</p>`;

            bettermentText.innerHTML = `<p>${betterment}</p>`;
        })
        .catch(error => {
            console.error('Error:', error);
            alert(error.message || 'An error occurred while running the comparison.');
        });
});