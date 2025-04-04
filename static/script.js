document.addEventListener('DOMContentLoaded', () => {
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

    let processCount = 4;

    function updateInputs(algo) {
        navLinks.forEach(l => l.classList.remove('active'));
        const activeLink = Array.from(navLinks).find(l => l.dataset.algo === algo);
        if (activeLink) activeLink.classList.add('active');

        algoInput.value = algo;
        const isRR = algo.includes("RR");
        const needsPriority = algo.includes("Priority");

        quantumSection.classList.toggle('hidden', !isRR);
        document.querySelectorAll('.priority-col').forEach(col => {
            col.classList.toggle('hidden', !needsPriority);
        });
    }

    function addProcessRow() {
        processCount++;
        const row = document.createElement('tr');
        row.dataset.id = processCount;
        row.innerHTML = `
            <td><input type="text" name="name${processCount}" value="P${processCount}"></td>
            <td><input type="number" name="arrival${processCount}" value="0" min="0"></td>
            <td><input type="number" name="burst${processCount}" value="1" min="1"></td>
            <td class="priority-col"><input type="number" name="priority${processCount}" value="1" min="1"></td>
            <td><button type="button" class="delete-btn">Delete</button></td>
        `;
        processRows.appendChild(row);
        row.querySelector('.delete-btn').addEventListener('click', () => deleteProcessRow(row));
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
        });
        processCount = processRows.children.length;
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

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const algo = algoInput.value;

        fetch('/', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            outputSection.classList.remove('hidden');
            ganttChart.innerHTML = '';
            algoDetails.innerHTML = '';
            defaultDetails.innerHTML = '';
            calcTimesText.innerHTML = '';
            formulasText.innerHTML = '';
            metricsTable.innerHTML = '';

            // Gantt Chart
            data.timeline.forEach(([name, start, end]) => {
                const block = document.createElement('div');
                block.className = 'gantt-block';
                block.style.width = `${(end - start) * 80}px`;
                block.innerHTML = `${name}<br>(${start}-${end})`;
                ganttChart.appendChild(block);
            });

            const blocks = document.querySelectorAll('.gantt-block');
            blocks.forEach((block, index) => {
                block.style.animationDelay = `${index * 0.5}s`;
            });

            // Default Explanation Text (Right Side)
            defaultDetails.innerHTML = `
                <div class="subtext">Each block represents a process running on the CPU.</div>
                <div class="subtext">The top text (e.g., "P1") is the process name.</div>
                <div class="subtext">The bottom text (e.g., "(2 6)") shows the time range: start time to end time.</div>
                <div class="subtext">Blocks appear one by one to show the execution order.</div>
                <div class="subtext">Wider blocks mean longer execution times.</div>
            `;

            // Algorithm-Specific Details (Left Side)
            if (algo === "FCFS Non-Preemptive") {
                algoDetails.innerHTML = `
                    <div class="subtext"><strong>FCFS Non-Preemptive:</strong></div>
                    <div class="subtext">Processes run in arrival order without interruption.</div>
                    <div class="subtext">Long blocks show full burst times, no splitting.</div>
                    <div class="subtext">Simple but may cause delays if a long process arrives first.</div>
                `;
            } else if (algo === "FCFS Preemptive") {
                algoDetails.innerHTML = `
                    <div class="subtext"><strong>FCFS Preemptive:</strong></div>
                    <div class="subtext">Processes run in arrival order but can be split by quantum.</div>
                    <div class="subtext">Smaller blocks show time slicing, increasing fairness.</div>
                    <div class="subtext">Reduces wait time for later arrivals.</div>
                `;
            } else if (algo === "SJF Non-Preemptive") {
                algoDetails.innerHTML = `
                    <div class="subtext"><strong>SJF Non-Preemptive:</strong></div>
                    <div class="subtext">Shortest job runs first once started, no interruption.</div>
                    <div class="subtext">Block sizes vary by burst time, optimizing wait times.</div>
                    <div class="subtext">Efficient but requires knowing burst times upfront.</div>
                `;
            } else if (algo === "SJF Preemptive") {
                algoDetails.innerHTML = `
                    <div class="subtext"><strong>SJF Preemptive:</strong></div>
                    <div class="subtext">Shortest remaining time runs, preempting longer jobs.</div>
                    <div class="subtext">Many small blocks due to frequent switching.</div>
                    <div class="subtext">Minimizes average wait time dynamically.</div>
                `;
            } else if (algo === "RR Non-Preemptive") {
                algoDetails.innerHTML = `
                    <div class="subtext"><strong>RR Non-Preemptive:</strong></div>
                    <div class="subtext">Each process gets up to quantum time, no preemption within run.</div>
                    <div class="subtext">Blocks are capped at quantum or burst, whichever is smaller.</div>
                    <div class="subtext">Balances fairness but may leave short jobs waiting.</div>
                `;
            } else if (algo === "RR Preemptive") {
                algoDetails.innerHTML = `
                    <div class="subtext"><strong>RR Preemptive:</strong></div>
                    <div class="subtext">Processes cycle with a quantum, preempting as needed.</div>
                    <div class="subtext">Many blocks per process show time slicing.</div>
                    <div class="subtext">Ensures all processes get CPU time fairly.</div>
                `;
            } else if (algo === "Priority Non-Preemptive") {
                algoDetails.innerHTML = `
                    <div class="subtext"><strong>Priority Non-Preemptive:</strong></div>
                    <div class="subtext">Lowest priority number runs first, no interruption.</div>
                    <div class="subtext">Block order reflects priority, not arrival or burst.</div>
                    <div class="subtext">Priority matters to favor important tasks, may starve low-priority ones.</div>
                `;
            } else if (algo === "Priority Preemptive") {
                algoDetails.innerHTML = `
                    <div class="subtext"><strong>Priority Preemptive:</strong></div>
                    <div class="subtext">Lowest priority number runs, preempting others.</div>
                    <div class="subtext">Frequent small blocks show priority switches.</div>
                    <div class="subtext">Ensures high-priority tasks finish fast, at cost of low-priority delays.</div>
                `;
            }

            // Calculated Times with Background Colors
            calcTimesText.innerHTML = `
                <div class="subtext bg-color1"><strong>Total Burst Time:</strong> ${data.total_bt}</div>
                <div class="subtext bg-color2"><strong>Total Turnaround Time:</strong> ${data.total_tat}</div>
                <div class="subtext bg-color3"><strong>Total Waiting Time:</strong> ${data.total_wt}</div>
                <div class="subtext bg-color4"><strong>Average Turnaround Time:</strong> ${(data.total_tat / data.metrics.length).toFixed(2)}</div>
                <div class="subtext bg-color5"><strong>Average Waiting Time:</strong> ${(data.total_wt / data.metrics.length).toFixed(2)}</div>
            `;

            // Formulas with Background Colors
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

            // Line Chart
            new Chart(document.getElementById('line-chart'), {
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
                options: { scales: { y: { beginAtZero: true } } }
            });

            // Bar Chart
            new Chart(document.getElementById('bar-chart'), {
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
                options: { scales: { y: { beginAtZero: true } } }
            });

            // Pie Charts
            new Chart(document.getElementById('pie-chart-bt'), {
                type: 'pie',
                data: {
                    labels: labels,
                    datasets: [{ data: btData, backgroundColor: ['#ff6384', '#36a2eb', '#ffcd56', '#4bc0c0'] }]
                }
            });

            new Chart(document.getElementById('pie-chart-ct'), {
                type: 'pie',
                data: {
                    labels: labels,
                    datasets: [{ data: ctData, backgroundColor: ['#ff6384', '#36a2eb', '#ffcd56', '#4bc0c0'] }]
                }
            });

            new Chart(document.getElementById('pie-chart-tat'), {
                type: 'pie',
                data: {
                    labels: labels,
                    datasets: [{ data: tatData, backgroundColor: ['#ff6384', '#36a2eb', '#ffcd56', '#4bc0c0'] }]
                }
            });

            new Chart(document.getElementById('pie-chart-wt'), {
                type: 'pie',
                data: {
                    labels: labels,
                    datasets: [{ data: wtData, backgroundColor: ['#ff6384', '#36a2eb', '#ffcd56', '#4bc0c0'] }]
                }
            });
        })
        .catch(error => console.error('Error:', error));
    });

    updateInputs('FCFS Non-Preemptive');
});