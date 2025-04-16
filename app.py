import sys
import subprocess
from flask import Flask, render_template, request, jsonify
import webbrowser
import platform

# Check and install Flask if not available
try:
    import flask
except ImportError:
    print("Flask not found. Installing Flask...")
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'flask'])
    import flask

app = Flask(__name__)

def compute_schedule(algo, processes, quantum=None):
    try:
        if not processes:
            raise ValueError("No processes provided")
        for p in processes:
            if p['burst'] <= 0:
                raise ValueError(f"Invalid burst time for process {p['name']}")
            if p['arrival'] < 0:
                raise ValueError(f"Invalid arrival time for process {p['name']}")

        timeline = []
        current_time = 0
        remaining = {p['name']: p['burst'] for p in processes}
        ready_queue = sorted(processes, key=lambda x: (x['arrival'], x['name']))
        completed = {}
        total_burst = sum(p['burst'] for p in processes)

        if algo == "FCFS Non-Preemptive":
            for p in ready_queue:
                if current_time < p['arrival']:
                    current_time = p['arrival']
                timeline.append([p['name'], current_time, current_time + p['burst']])
                current_time += p['burst']
                completed[p['name']] = current_time
        elif algo == "FCFS Preemptive":
            queue = ready_queue.copy()
            while any(v > 0 for v in remaining.values()):
                available = [p for p in queue if p['arrival'] <= current_time and remaining[p['name']] > 0]
                if not available:
                    current_time += 1
                    continue
                p = available[0]
                run_time = min(quantum or 1, remaining[p['name']])
                timeline.append([p['name'], current_time, current_time + run_time])
                current_time += run_time
                remaining[p['name']] -= run_time
                if remaining[p['name']] <= 0:
                    completed[p['name']] = current_time
                    queue.remove(p)
        elif algo == "SJF Non-Preemptive":
            active_queue = []
            while remaining or active_queue:
                active_queue.extend([p for p in ready_queue if p['arrival'] <= current_time and p['name'] in remaining])
                ready_queue = [p for p in ready_queue if p['arrival'] > current_time or p['name'] not in remaining]
                if not active_queue:
                    current_time += 1
                    continue
                p = min(active_queue, key=lambda x: x['burst'])
                timeline.append([p['name'], current_time, current_time + p['burst']])
                current_time += p['burst']
                completed[p['name']] = current_time
                del remaining[p['name']]
                active_queue.remove(p)
        elif algo == "SRTF":
            queue = ready_queue.copy()
            while any(v > 0 for v in remaining.values()):
                available = [p for p in queue if p['arrival'] <= current_time and remaining[p['name']] > 0]
                if not available:
                    current_time += 1
                    continue
                p = min(available, key=lambda x: remaining[x['name']])
                run_time = 1
                timeline.append([p['name'], current_time, current_time + run_time])
                current_time += run_time
                remaining[p['name']] -= run_time
                if remaining[p['name']] <= 0:
                    completed[p['name']] = current_time
                    queue.remove(p)
        elif algo == "RR Non-Preemptive":
            queue = ready_queue.copy()
            while queue:
                p = queue.pop(0)
                if current_time < p['arrival']:
                    current_time = p['arrival']
                run_time = min(remaining[p['name']], quantum or 2)
                timeline.append([p['name'], current_time, current_time + run_time])
                current_time += run_time
                remaining[p['name']] -= run_time
                if remaining[p['name']] <= 0:
                    completed[p['name']] = current_time
                else:
                    queue.append(p)
        elif algo == "RR Preemptive":
            queue = ready_queue.copy()
            while any(v > 0 for v in remaining.values()):
                available = [p for p in queue if p['arrival'] <= current_time and remaining[p['name']] > 0]
                if not available:
                    current_time += 1
                    continue
                p = queue.pop(0)
                run_time = min(quantum or 2, remaining[p['name']])
                timeline.append([p['name'], current_time, current_time + run_time])
                current_time += run_time
                remaining[p['name']] -= run_time
                if remaining[p['name']] <= 0:
                    completed[p['name']] = current_time
                else:
                    queue.append(p)
        elif algo == "Priority Non-Preemptive":
            active_queue = []
            while remaining or active_queue:
                active_queue.extend([p for p in ready_queue if p['arrival'] <= current_time and p['name'] in remaining])
                ready_queue = [p for p in ready_queue if p['arrival'] > current_time or p['name'] not in remaining]
                if not active_queue:
                    current_time += 1
                    continue
                p = min(active_queue, key=lambda x: x['priority'])
                timeline.append([p['name'], current_time, current_time + p['burst']])
                current_time += p['burst']
                completed[p['name']] = current_time
                del remaining[p['name']]
                active_queue.remove(p)
        elif algo == "Priority Preemptive":
            queue = ready_queue.copy()
            while any(v > 0 for v in remaining.values()):
                available = [p for p in queue if p['arrival'] <= current_time and remaining[p['name']] > 0]
                if not available:
                    current_time += 1
                    continue
                p = min(available, key=lambda x: x['priority'])
                run_time = 1
                timeline.append([p['name'], current_time, current_time + run_time])
                current_time += run_time
                remaining[p['name']] -= run_time
                if remaining[p['name']] <= 0:
                    completed[p['name']] = current_time
                    queue.remove(p)
        elif algo == "Multilevel Queue":
            fg_queue = [p for p in ready_queue if p['priority'] <= 2]
            bg_queue = [p for p in ready_queue if p['priority'] > 2]
            while fg_queue or bg_queue:
                if fg_queue:
                    p = fg_queue.pop(0)
                    if current_time < p['arrival']:
                        current_time = p['arrival']
                    run_time = min(remaining[p['name']], quantum or 2)
                    timeline.append([p['name'], current_time, current_time + run_time])
                    current_time += run_time
                    remaining[p['name']] -= run_time
                    if remaining[p['name']] <= 0:
                        completed[p['name']] = current_time
                    else:
                        fg_queue.append(p)
                elif bg_queue:
                    p = bg_queue.pop(0)
                    if current_time < p['arrival']:
                        current_time = p['arrival']
                    timeline.append([p['name'], current_time, current_time + p['burst']])
                    current_time += p['burst']
                    completed[p['name']] = current_time
                    del remaining[p['name']]
        elif algo == "Multilevel Feedback Queue":
            q1 = ready_queue.copy()
            q2 = []
            q3 = []
            queue_levels = {p['name']: 1 for p in processes}
            while any(v > 0 for v in remaining.values()):
                available_q1 = [p for p in q1 if p['arrival'] <= current_time and remaining[p['name']] > 0]
                if available_q1:
                    p = available_q1[0]
                    run_time = min(quantum or 2, remaining[p['name']])
                    timeline.append([p['name'], current_time, current_time + run_time])
                    current_time += run_time
                    remaining[p['name']] -= run_time
                    if remaining[p['name']] <= 0:
                        completed[p['name']] = current_time
                        q1.remove(p)
                    else:
                        q1.remove(p)
                        queue_levels[p['name']] = 2
                        q2.append(p)
                    continue
                available_q2 = [p for p in q2 if p['arrival'] <= current_time and remaining[p['name']] > 0]
                if available_q2:
                    p = available_q2[0]
                    run_time = min(quantum or 4, remaining[p['name']])
                    timeline.append([p['name'], current_time, current_time + run_time])
                    current_time += run_time
                    remaining[p['name']] -= run_time
                    if remaining[p['name']] <= 0:
                        completed[p['name']] = current_time
                        q2.remove(p)
                    else:
                        q2.remove(p)
                        queue_levels[p['name']] = 3
                        q3.append(p)
                    continue
                available_q3 = [p for p in q3 if p['arrival'] <= current_time and remaining[p['name']] > 0]
                if available_q3:
                    p = available_q3[0]
                    run_time = remaining[p['name']]
                    timeline.append([p['name'], current_time, current_time + run_time])
                    current_time += run_time
                    remaining[p['name']] = 0
                    completed[p['name']] = current_time
                    q3.remove(p)
                    continue
                current_time += 1

        # Calculate metrics
        metrics = []
        total_tat = 0
        total_wt = 0
        for p in processes:
            ct = completed.get(p['name'], 0)
            tat = ct - p['arrival'] if ct > 0 else 0
            wt = max(tat - p['burst'], 0)
            total_tat += tat
            total_wt += wt
            metrics.append({
                'name': p['name'],
                'at': p['arrival'],
                'bt': p['burst'],
                'ct': ct,
                'tat': tat,
                'wt': wt
            })

        return {
            'timeline': timeline,
            'metrics': metrics,
            'total_bt': total_burst,
            'total_tat': total_tat,
            'total_wt': total_wt
        }
    except ValueError as e:
        return {'error': str(e)}, 400

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/compare')
def compare():
    return render_template('compare.html')

@app.route('/', methods=['POST'])
def run_simulation():
    try:
        algo = request.form.get('algo')
        quantum = int(request.form.get('quantum', 0)) if "RR" in algo or "Multilevel" in algo else None
        processes = []
        i = 1
        while f'name{i}' in request.form:
            name = request.form.get(f'name{i}', f'P{i}')
            arrival = int(request.form.get(f'arrival{i}', 0))
            burst = int(request.form.get(f'burst{i}', 1))
            priority = int(request.form.get(f'priority{i}', 1)) if f'priority{i}' in request.form else 1
            processes.append({'name': name, 'arrival': arrival, 'burst': burst, 'priority': priority})
            i += 1
        result = compute_schedule(algo, processes, quantum)
        if 'error' in result:
            return jsonify(result), 400
        return jsonify(result)
    except ValueError as e:
        return jsonify({'error': str(e)}), 400

def open_browser():
    url = 'http://127.0.0.1:5000'
    system = platform.system()
    try:
        if system == 'Linux':
            webbrowser.get('xdg-open').open_new_tab(url)
        else:
            webbrowser.open_new_tab(url)
    except Exception as e:
        print(f"Could not open browser: {e}. Please open {url} manually.")

if __name__ == '__main__':
    open_browser()
    app.run(host='0.0.0.0', port=5000)