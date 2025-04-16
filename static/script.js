document.addEventListener('DOMContentLoaded', () => {
    const processInput = document.querySelector('.process-input');
    const form = document.getElementById('process-form');
    const navLinks = document.querySelectorAll('.nav a');
    const algoInput = document.getElementById('algo');
    const outputSection = document.querySelector('.output-section');
    const ganttChart = document.getElementById('gantt-chart');
    const algoDetails = document.getElementById('algo-details');
    const defaultDetails = document.getElementById('default-details');
    const calcTimesText = document.getElementById('calc-times-text');
    const formulasText = document.getElementById('formulas-text');
    const metricsTable = document.getElementById('metrics-table');
    const processRows = document.getElementById('process-rows');
    const addProcessBtn = document.getElementById('add-process');
    const quantumSection = document.getElementById('quantum-section');
    const errorMessage = document.getElementById('error-message');
    const compareSection = document.getElementById('compare-section');
    const compareAlgoSelect = document.getElementById('compare-algo');
    const compareBtn = document.getElementById('compare-btn');

    let processCount = 4;
    let charts = {}; // Store Chart.js instances
    let currentFormData = null; // Store form data for comparison

    function validateInput(input) {
        const value = parseInt(input.value);
        if (input.name.includes('burst') && (isNaN(value) || value <= 0)) {
            input.classList.add('error');
            input.setCustomValidity('Burst time must be greater than 0');
            return false;
        } else if (input.name.includes('arrival') && (isNaN(value) || value < 0)) {
            input.classList.add('error');
            input.setCustomValidity('Arrival time cannot be negative');
            return false;
        } else if (input.name.includes('priority') && (isNaN(value) || value < 1)) {
            input.classList.add('error');
            input.setCustomValidity('Priority must be at least 1');
            return false;
        } else {
            input.classList.remove('error');
            input.setCustomValidity('');
            return true;
        }
    }

    function validateForm() {
        let valid = true;
        document.querySelectorAll('#process-rows input[type="number"]').forEach(input => {
            if (!validateInput(input)) {
                valid = false;
            }
        });
        return valid;
    }

    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.classList.remove('hidden');
        setTimeout(() => errorMessage.classList.add('hidden'), 5000);
    }

    function updateInputs(algo) {
        navLinks.forEach(l => l.classList.remove('active'));
        const activeLink = Array.from(navLinks).find(l => l.dataset.algo === algo);
        if (activeLink) activeLink.classList.add('active');

        algoInput.value = algo;
        const isRR = algo.includes("RR") || algo.includes("Multilevel");
        const needsPriority = algo.includes("Priority") || algo.includes("Multilevel");

        quantumSection.classList.toggle('hidden', !isRR);
        document.querySelectorAll('.priority-col').forEach(col => {
            col.classList.toggle('hidden', !needsPriority);
        });

        // Show the process input section when a nav link is clicked
        processInput.classList.remove('hidden');
    }

    function addProcessRow() {
        processCount++;
        const row = document.createElement('tr');
        row.dataset.id = processCount;
        row.innerHTML = `
            <td><input type="text" name="name${processCount}" value="P${processCount}" aria-label="Process name ${processCount}"></td>
            <td><input type="number" name="arrival${processCount}" value="0" min="0" aria-label="Arrival time ${processCount}"></td>
            <td><input type="number" name="burst${processCount}" value="1" min="1" aria-label="Burst time ${processCount}"></td>
            <td class="priority-col"><input type="number" name="priority${processCount}" value="1" min="1" aria-label="Priority ${processCount}"></td>
            <td><button type="button" class="delete-btn" aria-label="Delete process ${processCount}">Delete</button></td>
        `;
        processRows.appendChild(row);
        row.querySelector('.delete-btn').addEventListener('click', () => deleteProcessRow(row));
        row.querySelectorAll('input[type="number"]').forEach(input => {
            input.addEventListener('input', () => validateInput(input));
        });
        updateInputs(algoInput.value);
    }

    function deleteProcessRow(row) {
        if (processRows.children.length > 1) {
            processRows.removeChild(row);
            renumberProcesses();
        }
    }

    function renumberProcesses() {
        Array.from(processRows.children).forEach((row, index) => {
            const id = index + 1;
            row.dataset.id = id;
            row.querySelector('input[name^="name"]').name = `name${id}`;
            row.querySelector('input[name^="arrival"]').name = `arrival${id}`;
            row.querySelector('input[name^="burst"]').name = `burst${id}`;
            row.querySelector('input[name^="priority"]').name = `priority${id}`;
            row.querySelector('input[name^="name"]').setAttribute('aria-label', `Process name ${id}`);
            row.querySelector('input[name^="arrival"]').setAttribute('aria-label', `Arrival time ${id}`);
            row.querySelector('input[name^="burst"]').setAttribute('aria-label', `Burst time ${id}`);
            row.querySelector('input[name^="priority"]').setAttribute('aria-label', `Priority ${id}`);
            row.querySelector('.delete-btn').setAttribute('aria-label', `Delete process ${id}`);
        });
        processCount = processRows.children.length;
    }

    function destroyCharts() {
        Object.values(charts).forEach(chart => {
            if (chart) chart.destroy();
        });
        charts = {};
    }

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            updateInputs(link.dataset.algo);
        });
    });

    addProcessBtn.addEventListener('click', addProcessRow);

    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', () => deleteProcessRow(btn.closest('tr')));
    });

    document.querySelectorAll('input[type="number"]').forEach(input => {
        input.addEventListener('input', () => validateInput(input));
    });

    compareBtn.addEventListener('click', () => {
        const algo1 = algoInput.value;
        const algo2 = compareAlgoSelect.value;
        if (algo1 === algo2) {
            showError('Please select a different algorithm to compare.');
            return;
        }
        const formDataSerialized = new URLSearchParams(currentFormData).toString();
        window.location.href = `/compare?algo1=${encodeURIComponent(algo1)}&algo2=${encodeURIComponent(algo2)}&${formDataSerialized}`;
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!validateForm()) {
            showError('Please correct invalid inputs before running the simulation.');
            return;
        }

        const formData = new FormData(form);
        currentFormData = formData; // Store form data for comparison
        const algo = algoInput.value;

        fetch('/', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(err => { throw new Error(err.error); });
            }
            return response.json();
        })
        .then(data => {
            outputSection.classList.remove('hidden');
            compareSection.classList.remove('hidden'); // Show comparison section
            ganttChart.innerHTML = '';
            algoDetails.innerHTML = '';
            defaultDetails.innerHTML = '';
            calcTimesText.innerHTML = '';
            formulasText.innerHTML = '';
            metricsTable.innerHTML = '';

            // Destroy existing charts
            destroyCharts();

            // Gantt Chart
            data.timeline.forEach(([name, start, end], index) => {
                if (index < 100) {  // Limit to 100 blocks for performance
                    const block = document.createElement('div');
                    block.className = 'gantt-block';
                    block.style.width = `${Math.max((end - start) * 80, 20)}px`;
                    block.innerHTML = `${name}<br>(${start}-${end})`;
                    ganttChart.appendChild(block);
                }
            });

            const blocks = document.querySelectorAll('.gantt-block');
            blocks.forEach((block, index) => {
                block.style.animationDelay = `${index * 0.5}s`;
            });

            // Default Explanation Text
            defaultDetails.innerHTML = `
                <div class="subtext">Each block represents a process running on the CPU.</div>
                <div class="subtext">The top text (e.g., "P1") is the process name.</div>
                <div class="subtext">The bottom text (e.g., "(2-6)") shows the time range: start time to end time.</div>
                <div class="subtext">Blocks appear one by one to show the execution order.</div>
                <div class="subtext">Wider blocks mean longer execution times.</div>
            `;

            // Algorithm-Specific Details
            if (algo === "FCFS Non-Preemptive") {
                algoDetails.innerHTML = `
                    <div class="subtext"><strong>FCFS Non-Preemptive:</strong></div>
                    <div class="subtext">Processes are executed in the exact order of arrival, with no interruption once a process starts running.</div>
                    <div class="subtext">Each process holds the CPU until it finishes, resulting in large continuous blocks representing full burst times.</div>
                    <div class="subtext">Simple and easy to implement but can lead to the "convoy effect," where short processes wait behind long ones, increasing average waiting time.</div>
                `;
            } else if (algo === "FCFS Preemptive") {
                algoDetails.innerHTML = `
                    <div class="subtext"><strong>FCFS Preemptive:</strong></div>
                    <div class="subtext">Processes are selected based on arrival time but can be interrupted at regular intervals using time quantum.</div>
                    <div class="subtext">CPU allocation is split into smaller time slices, giving a fairer distribution among processes and reducing long wait times.</div>
                    <div class="subtext">It combines the simplicity of FCFS with the responsiveness of preemption, improving overall system performance for short jobs.</div>
                `;
            } else if (algo === "SJF Non-Preemptive") {
                algoDetails.innerHTML = `
                    <div class="subtext"><strong>SJF Non-Preemptive:</strong></div>
                    <div class="subtext">Processes with the shortest burst time are selected first and run to completion without interruption.</div>
                    <div class="subtext">CPU is assigned based on minimal execution time, leading to reduced average waiting and turnaround times.</div>
                    <div class="subtext">Highly efficient in ideal scenarios, but requires accurate burst time prediction and may cause starvation for long processes.</div>
                `;
            } else if (algo === "SRTF") {
                algoDetails.innerHTML = `
                    <div class="subtext"><strong>Shortest Remaining Time First (SRTF):</strong></div>
                    <div class="subtext">A preemptive version of SJF where the process with the least remaining burst time is always selected to run.</div>
                    <div class="subtext">If a new process arrives with a shorter remaining time, it interrupts the currently running process.</div>
                    <div class="subtext">Offers the lowest average waiting time, but frequent context switching and starvation of longer jobs are possible.</div>
                `;
            } else if (algo === "RR Non-Preemptive") {
                algoDetails.innerHTML = `
                    <div class="subtext"><strong>RR Non-Preemptive:</strong></div>
                    <div class="subtext">Each process gets CPU for a time quantum and runs uninterrupted during its slot.</div>
                    <div class="subtext">If the process doesn’t complete in the time quantum, it re-enters the queue to wait for its next turn.</div>
                    <div class="subtext">Combines fairness with reduced overhead, but longer jobs may still wait behind multiple short ones.</div>
                `;
            } else if (algo === "RR Preemptive") {
                algoDetails.innerHTML = `
                    <div class="subtext"><strong>RR Preemptive:</strong></div>
                    <div class="subtext">Time-sharing strategy where each process gets a fixed quantum and is forcibly switched if it exceeds it.</div>
                    <div class="subtext">Ensures that all processes receive regular CPU access, improving response time for interactive tasks.</div>
                    <div class="subtext">Efficient for time-sharing systems but may result in high context-switching overhead with too small a quantum.</div>
                `;
            } else if (algo === "Priority Non-Preemptive") {
                algoDetails.innerHTML = `
                    <div class="subtext"><strong>Priority Non-Preemptive:</strong></div>
                    <div class="subtext">CPU is assigned to the process with the highest priority (lowest number), running it to completion before checking others.</div>
                    <div class="subtext">Arrival order and burst time are ignored in favor of static priority levels.</div>
                    <div class="subtext">Efficient for handling critical tasks first but risks starvation for low-priority processes if high-priority ones keep arriving.</div>
                `;
            } else if (algo === "Priority Preemptive") {
                algoDetails.innerHTML = `
                    <div class="subtext"><strong>Priority Preemptive:</strong></div>
                    <div class="subtext">Similar to Priority Non-Preemptive but allows a running process to be interrupted if a higher priority one arrives.</div>
                    <div class="subtext">The scheduler frequently evaluates priority levels, enabling dynamic control of CPU access.</div>
                    <div class="subtext">Maximizes responsiveness to urgent tasks but can lead to starvation of lower-priority processes and more context switches.</div>
                `;
            } else if (algo === "Multilevel Queue") {
                algoDetails.innerHTML = `
                    <div class="subtext"><strong>Multilevel Queue:</strong></div>
                    <div class="subtext">Processes are classified into separate queues based on priority: Foreground (Priority 1–2) uses RR (quantum=2), Background (Priority 3+) uses FCFS.</div>
                    <div class="subtext">Foreground queue is always served first, and background only runs when foreground is empty.</div>
                    <div class="subtext">Enforces strict process type separation, ideal for distinguishing between interactive and batch jobs, but background processes can suffer from starvation.</div>
                `;
            } else if (algo === "Multilevel Feedback Queue") {
                algoDetails.innerHTML = `
                    <div class="subtext"><strong>Multilevel Feedback Queue:</strong></div>
                    <div class="subtext">Dynamic system with three levels: Q1 (RR, quantum=2), Q2 (RR, quantum=4), Q3 (FCFS). New processes start in Q1.</div>
                    <div class="subtext">If a process exceeds its quantum in a queue, it is demoted to a lower-priority queue (e.g., from Q1 to Q2).</div>
                    <div class="subtext">Favors short and interactive processes, automatically adjusts to process behavior, and avoids starvation through aging or queue migration policies.</div>
                `;
            }

            // Calculated Times
            calcTimesText.innerHTML = `
                <div class="subtext bg-color1"><strong>Total Burst Time:</strong> ${data.total_bt}</div>
                <div class="subtext bg-color2"><strong>Total Turnaround Time:</strong> ${data.total_tat}</div>
                <div class="subtext bg-color3"><strong>Total Waiting Time:</strong> ${data.total_wt}</div>
                <div class="subtext bg-color4"><strong>Average Turnaround Time:</strong> ${(data.total_tat / data.metrics.length).toFixed(2)}</div>
                <div class="subtext bg-color5"><strong>Average Waiting Time:</strong> ${(data.total_wt / data.metrics.length).toFixed(2)}</div>
            `;

            // Formulas
            formulasText.innerHTML = `
                <div class="subtext bg-color1"><strong>Completion Time (CT):</strong> Time when process finishes</div>
                <div class="subtext bg-color2"><strong>Turnaround Time (TAT):</strong> CT - Arrival Time (AT)</div>
                <div class="subtext bg-color3"><strong>Waiting Time (WT):</strong> TAT - Burst Time (BT)</div>
            `;

            // Calculated Table
            let tableHTML = '<table><tr><th>Process</th><th>AT</th><th>BT</th><th>CT</th><th>TAT</th><th>WT</th></tr>';
            data.metrics.forEach(m => {
                tableHTML += `<tr><td>${m.name}</td><td>${m.at}</td><td>${m.bt}</td><td>${m.ct}</td><td>${m.tat}</td><td>${m.wt}</td></tr>`;
            });
            tableHTML += '</table>';
            metricsTable.innerHTML = tableHTML;

            // Graphical Visualization
            const labels = data.metrics.map(m => m.name);
            const btData = data.metrics.map(m => m.bt);
            const ctData = data.metrics.map(m => m.ct);
            const tatData = data.metrics.map(m => m.tat);
            const wtData = data.metrics.map(m => m.wt);

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
                        left: isMobile ? 20 : 20,
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

            const barChartOptions = {
                ...chartOptions,
                layout: {
                    padding: {
                        left: isMobile ? 40 : 20,
                        right: 20,
                        top: 10,
                        bottom: 10
                    }
                }
            };

            // Line Chart
            charts['line-chart'] = new Chart(document.getElementById('line-chart'), {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [
                        { label: 'Burst Time', data: btData, borderColor: '#ff6384', fill: false },
                        { label: 'Completion Time', data: ctData, borderColor: '#36a2eb', fill: false },
                        { label: 'Turnaround Time', data: tatData, borderColor: '#ffcd56', fill: false },
                        { label: 'Waiting Time', data: wtData, borderColor: '#4bc0c0', fill: false }
                    ]
                },
                options: chartOptions
            });

            // Bar Chart
            charts['bar-chart'] = new Chart(document.getElementById('bar-chart'), {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [
                        { label: 'Burst Time', data: btData, backgroundColor: '#ff6384' },
                        { label: 'Completion Time', data: ctData, backgroundColor: '#36a2eb' },
                        { label: 'Turnaround Time', data: tatData, backgroundColor: '#ffcd56' },
                        { label: 'Waiting Time', data: wtData, backgroundColor: '#4bc0c0' }
                    ]
                },
                options: barChartOptions
            });

            // Pie Charts
            charts['pie-chart-bt'] = new Chart(document.getElementById('pie-chart-bt'), {
                type: 'pie',
                data: {
                    labels: labels,
                    datasets: [{ data: btData, backgroundColor: ['#ff6384', '#36a2eb', '#ffcd56', '#4bc0c0'] }]
                }
            });

            charts['pie-chart-ct'] = new Chart(document.getElementById('pie-chart-ct'), {
                type: 'pie',
                data: {
                    labels: labels,
                    datasets: [{ data: ctData, backgroundColor: ['#ff6384', '#36a2eb', '#ffcd56', '#4bc0c0'] }]
                }
            });

            charts['pie-chart-tat'] = new Chart(document.getElementById('pie-chart-tat'), {
                type: 'pie',
                data: {
                    labels: labels,
                    datasets: [{ data: tatData, backgroundColor: ['#ff6384', '#36a2eb', '#ffcd56', '#4bc0c0'] }]
                }
            });

            charts['pie-chart-wt'] = new Chart(document.getElementById('pie-chart-wt'), {
                type: 'pie',
                data: {
                    labels: labels,
                    datasets: [{ data: wtData, backgroundColor: ['#ff6384', '#36a2eb', '#ffcd56', '#4bc0c0'] }]
                }
            });
        })
        .catch(error => {
            console.error('Error:', error);
            showError(error.message || 'An error occurred while running the simulation.');
        });
    });
});