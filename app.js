// Constants
const SUBJECTS = {
    MATH: ["Arithmetic", "Algebra", "Geometry", "Calculus", "Trigonometry"],
    LOGIC: ["Logic"],
    SCI: ["Chemistry", "Biology", "Earth Science", "Physics"],
    ENG: ["English"]
};
const ALL_SUBJ = [...SUBJECTS.MATH, ...SUBJECTS.LOGIC, ...SUBJECTS.SCI, ...SUBJECTS.ENG];

// App State
let appData = {
    students: [],
    pre: {},
    post: {},
    benchmarks: { pre: {}, post: {} }
};

let chartInstances = {};

// DOM Elements
const elements = {
    upload: document.getElementById('excel-upload'),
    studentSelect: document.getElementById('student-select'),
    reportType: document.getElementById('report-type'),
    generateBtn: document.getElementById('generate-btn'),
    printBtn: document.getElementById('print-btn'),
    statusMsg: document.getElementById('status-msg'),
    previewSection: document.getElementById('preview-section'),
    reportWrap: document.getElementById('report-wrap')
};

// Initialize Chart.js plugin
Chart.register(ChartDataLabels);

// Event Listeners
elements.upload.addEventListener('change', handleFileUpload);
elements.generateBtn.addEventListener('click', generateReport);
elements.printBtn.addEventListener('click', requestPythonPDF);

function setStatus(msg, isError=false) {
    elements.statusMsg.style.color = isError ? '#E74C3C' : '#1A4B6E';
    elements.statusMsg.textContent = msg;
}

// ══════════════════════════════════════════════════════════════
// EXCEL PARSING
// ══════════════════════════════════════════════════════════════
function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    setStatus("Ingesting data payload...");
    elements.generateBtn.disabled = true;
    elements.studentSelect.disabled = true;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, {type: 'array'});
            parseTrackerData(workbook);
            setStatus(`Data initialized: ${appData.students.length} candidate profiles loaded.`);
            
            // Populate select
            elements.studentSelect.innerHTML = '';
            appData.students.forEach(name => {
                const opt = document.createElement('option');
                opt.value = name;
                opt.textContent = name;
                elements.studentSelect.appendChild(opt);
            });
            
            elements.studentSelect.disabled = false;
            elements.generateBtn.disabled = false;
        } catch (error) {
            setStatus("Critical error parsing raw data format.", true);
            console.error(error);
        }
    };
    reader.readAsArrayBuffer(file);
}

function parseTrackerData(workbook) {
    appData = { students: [], pre: {}, post: {}, benchmarks: { pre: {}, post: {} } };
    
    const sheetsToRead = [
        { key: 'pre', name: 'Pre-Test Data' },
        { key: 'post', name: 'Post-Test Data' }
    ];

    sheetsToRead.forEach(sheetInfo => {
        const ws = workbook.Sheets[sheetInfo.name];
        if (!ws) return;

        const jsonData = XLSX.utils.sheet_to_json(ws, {header: 1}); 
        
        for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (!row || row.length === 0) continue;
            
            const fullName = row[3]; 
            if (!fullName) continue;

            if (!appData.students.includes(fullName)) {
                appData.students.push(fullName);
            }

            const studentData = {
                total: parseFloat(row[4]) || 0 
            };

            ALL_SUBJ.forEach((subj, idx) => {
                const colIdx = 5 + idx;
                studentData[subj] = parseFloat(row[colIdx]) || 0;
            });

            appData[sheetInfo.key][fullName] = studentData;
        }
    });

    computeBenchmarks('pre');
    computeBenchmarks('post');
}

function computeBenchmarks(testType) {
    ALL_SUBJ.forEach(subj => {
        const scores = appData.students
            .map(s => (appData[testType][s] ? appData[testType][s][subj] : 0))
            .filter(val => !isNaN(val));
        
        const sum = scores.reduce((a, b) => a + b, 0);
        appData.benchmarks[testType][subj] = scores.length ? (sum / scores.length) : 0;
    });
}

// ══════════════════════════════════════════════════════════════
// REPORT GENERATION & INJECTION
// ══════════════════════════════════════════════════════════════
function generateReport() {
    const studentName = elements.studentSelect.value;
    const reportType = elements.reportType.value;
    
    if (!studentName) return;

    // 1. Clone the template into the wrapper
    const templateHTML = document.getElementById('hidden-report-template').innerHTML;
    elements.reportWrap.innerHTML = templateHTML;

    // Get the newly injected DOM nodes
    const nodes = {
        cardTypeTitle: document.getElementById('card-type-title'),
        studentNameDisplay: document.getElementById('student-name-display'),
        metricsContainer: document.getElementById('metrics-container'),
        gradeTableHead: document.getElementById('grade-table-head'),
        gradeTableBody: document.getElementById('grade-table-body'),
        chartDescDisplay: document.getElementById('chart-desc-display'),
        teacherFeedbackDisplay: document.getElementById('teacher-feedback-display')
    };

    const pre = appData.pre[studentName] || {};
    const post = appData.post[studentName] || {};
    const preTotal = pre.total || 0;
    const postTotal = post.total || 0;
    const improvement = postTotal - preTotal;

    // Set Titles
    if (reportType === 'pre') nodes.cardTypeTitle.textContent = "PRE-TEST REPORT CARD";
    else if (reportType === 'post') nodes.cardTypeTitle.textContent = "POST-TEST REPORT CARD";
    else nodes.cardTypeTitle.textContent = "STUDENT PROGRESS CARD";

    nodes.studentNameDisplay.textContent = studentName;

    // Render Sub-components
    renderMetrics(nodes, reportType, preTotal, postTotal, improvement);
    renderGradeTable(nodes, reportType, pre, post);
    renderCharts(nodes, reportType, pre, post);
    renderFeedback(nodes, reportType, pre, post, improvement);

    setStatus(`Document generated successfully.`);
    
    // Un-hide the preview section
    if (elements.previewSection.classList.contains('hidden')) {
        elements.previewSection.classList.remove('hidden');
        ScrollTrigger.refresh();
        
        // Scroll down smoothly
        gsap.to(window, {
            duration: 1.5, 
            scrollTo: elements.previewSection, 
            ease: "power4.out"
        });
    } else {
        // Just fade it to indicate a change
        gsap.from(elements.reportWrap, { opacity: 0.5, y: 10, duration: 0.5 });
    }
}

// ══════════════════════════════════════════════════════════════
// BACKEND PDF REQUEST (FLASK API)
// ══════════════════════════════════════════════════════════════
async function requestPythonPDF() {
    const studentName = elements.studentSelect.value;
    const reportType = elements.reportType.value;
    const fileInput = elements.upload.files[0];
    
    if (!studentName || !fileInput) return;
    
    // UI Feedback
    const originalText = elements.printBtn.textContent;
    elements.printBtn.textContent = "GENERATING IN PYTHON...";
    elements.printBtn.disabled = true;
    setStatus("Requesting precision PDF from backend engine...");
    
    try {
        const formData = new FormData();
        formData.append('excel_file', fileInput);
        formData.append('student_name', studentName);
        formData.append('report_type', reportType);
        
        const response = await fetch('/generate-pdf', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error(`Server returned ${response.status}: ${response.statusText}`);
        }
        
        // Get filename from Content-Disposition header if possible
        let filename = "Report_Card.pdf";
        const disposition = response.headers.get('Content-Disposition');
        if (disposition && disposition.indexOf('attachment') !== -1) {
            const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
            const matches = filenameRegex.exec(disposition);
            if (matches != null && matches[1]) {
                filename = matches[1].replace(/['"]/g, '');
            }
        }
        
        // Trigger browser download
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        
        // Cleanup
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        setStatus("PDF Downloaded successfully!");
    } catch (error) {
        console.error("PDF Generation Error:", error);
        setStatus("Failed to generate PDF from Python backend. Is the server running?", true);
    } finally {
        elements.printBtn.textContent = originalText;
        elements.printBtn.disabled = false;
    }
}

function renderMetrics(nodes, reportType, preTotal, postTotal, improvement) {
    nodes.metricsContainer.innerHTML = '';
    
    if (reportType === 'both') {
        const impColor = improvement >= 0 ? 'success' : 'danger';
        const impBg = improvement >= 0 ? 'bg-success' : 'bg-danger';
        const statusText = improvement >= 0 ? 'IMPROVED' : 'NEEDS HELP';
        const impSign = improvement > 0 ? '+' : '';

        nodes.metricsContainer.innerHTML = `
            <div class="metric-box bg-light-marine">
                <div class="metric-label">PRE-TEST TOTAL</div>
                <div class="metric-value">${preTotal}</div>
            </div>
            <div class="metric-box bg-light-marine">
                <div class="metric-label">POST-TEST TOTAL</div>
                <div class="metric-value">${postTotal}</div>
            </div>
            <div class="metric-box ${impBg}">
                <div class="metric-label">IMPROVEMENT</div>
                <div class="metric-value ${impColor}">${impSign}${improvement}</div>
            </div>
            <div class="metric-box bg-light-marine">
                <div class="metric-label">STATUS</div>
                <div class="metric-status">${statusText}</div>
            </div>
        `;
    } else {
        const total = reportType === 'pre' ? preTotal : postTotal;
        const label = reportType === 'pre' ? 'PRE-TEST TOTAL' : 'POST-TEST TOTAL';
        nodes.metricsContainer.innerHTML = `
            <div class="metric-box bg-light-marine">
                <div class="metric-label">${label}</div>
                <div class="metric-value">${total}</div>
            </div>
        `;
    }
}

function renderGradeTable(nodes, reportType, pre, post) {
    nodes.gradeTableHead.innerHTML = '';
    nodes.gradeTableBody.innerHTML = '';

    if (reportType === 'both') {
        nodes.gradeTableHead.innerHTML = `
            <th>Subject</th>
            <th style="width:18%">Pre-Test</th>
            <th style="width:18%">Post-Test</th>
            <th style="width:29%">Remarks</th>
        `;
    } else {
        const label = reportType === 'pre' ? 'Pre-Test Score' : 'Post-Test Score';
        nodes.gradeTableHead.innerHTML = `
            <th style="width:60%">Subject</th>
            <th style="width:40%">${label}</th>
        `;
    }

    ALL_SUBJ.forEach(subj => {
        const preScore = pre[subj] || 0;
        const postScore = post[subj] || 0;
        const tr = document.createElement('tr');

        if (reportType === 'both') {
            let remark = "Review Needed";
            if (postScore > preScore) remark = "Improved";
            else if (postScore === preScore) remark = "Maintained";
            
            tr.innerHTML = `
                <td style="font-weight:bold">${subj}</td>
                <td>${preScore}</td>
                <td>${postScore}</td>
                <td>${remark}</td>
            `;
        } else {
            const score = reportType === 'pre' ? preScore : postScore;
            tr.innerHTML = `
                <td style="font-weight:bold">${subj}</td>
                <td>${score}</td>
            `;
        }
        nodes.gradeTableBody.appendChild(tr);
    });
}

function renderFeedback(nodes, reportType, pre, post, improvement) {
    const scoresToUse = reportType === 'pre' ? pre : post;
    const testScores = {};
    ALL_SUBJ.forEach(s => testScores[s] = scoresToUse[s] || 0);
    
    let strongest = ALL_SUBJ[0];
    let weakest = ALL_SUBJ[0];
    ALL_SUBJ.forEach(s => {
        if (testScores[s] > testScores[strongest]) strongest = s;
        if (testScores[s] < testScores[weakest]) weakest = s;
    });

    let fb = "";
    if (reportType === 'both') {
        fb += improvement > 10 ? "Excellent progress from Pre-Test to Post-Test! " : "Targeted review is recommended to boost overall performance. ";
    } else if (reportType === 'pre') {
        fb += "Initial assessment completed. ";
    } else if (reportType === 'post') {
        fb += "Final assessment completed. ";
    }

    fb += `This student shows strongest mastery in <b>${strongest}</b>. `;
    fb += `The area requiring the most attention is <b>${weakest}</b>. `;
    
    if (reportType !== 'post') {
        fb += `Consider additional one-on-one tutoring in this subject during the upcoming review sessions.`;
    }

    nodes.teacherFeedbackDisplay.innerHTML = fb;
}

// ══════════════════════════════════════════════════════════════
// CHART GENERATION (Chart.js)
// ══════════════════════════════════════════════════════════════
function renderCharts(nodes, reportType, pre, post) {
    if (reportType === 'pre') {
        nodes.chartDescDisplay.textContent = "The charts below show the student's Pre-Test performance. A longer dark blue bar indicates higher initial mastery in that specific subject area.";
    } else if (reportType === 'post') {
        nodes.chartDescDisplay.textContent = "The charts below show the student's Post-Test performance. A longer dark blue bar indicates higher mastery in that specific subject area.";
    } else {
        nodes.chartDescDisplay.textContent = "The charts below compare the student's Post-Test performance against the cohort average. A longer dark blue bar indicates higher mastery in that specific subject area.";
    }

    const chartScores = reportType === 'pre' ? pre : post;
    const chartBench = reportType === 'pre' ? appData.benchmarks.pre : appData.benchmarks.post;

    drawChart('mathChart', 'Mathematics', SUBJECTS.MATH, chartScores, chartBench);
    drawChart('sciChart', 'Science', SUBJECTS.SCI, chartScores, chartBench);
    drawChart('logicChart', 'Logic', SUBJECTS.LOGIC, chartScores, chartBench);
    drawChart('engChart', 'English', SUBJECTS.ENG, chartScores, chartBench);
}

function drawChart(canvasId, title, labels, scoresData, benchData) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return; // safety
    const ctx = canvas.getContext('2d');
    
    if (chartInstances[canvasId]) {
        chartInstances[canvasId].destroy();
    }

    const studentScores = labels.map(l => scoresData[l] || 0);
    const benchmarkScores = labels.map(l => benchData[l] || 0);

    const maxVal = Math.max(...studentScores, ...benchmarkScores, 1);

    chartInstances[canvasId] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Student',
                    data: studentScores,
                    backgroundColor: '#1A4B6E',
                    barThickness: 10,
                },
                {
                    label: 'Benchmark',
                    data: benchmarkScores,
                    backgroundColor: '#BDC3C7',
                    barThickness: 10,
                }
            ]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: { top: 30, right: 20 }
            },
            plugins: {
                title: {
                    display: true,
                    text: title,
                    align: 'start',
                    color: '#1A4B6E',
                    font: { family: 'Helvetica', size: 14, weight: 'bold' },
                    padding: { bottom: 15 }
                },
                legend: {
                    position: 'top',
                    align: 'end',
                    labels: {
                        color: '#7F8C8D',
                        font: { size: 10, family: 'Helvetica' },
                        boxWidth: 10,
                        usePointStyle: true,
                    }
                },
                datalabels: {
                    anchor: 'end',
                    align: 'right',
                    offset: 4,
                    color: (context) => context.datasetIndex === 0 ? '#2C3E50' : '#7F8C8D',
                    font: { size: 9, family: 'Helvetica' },
                    formatter: (value) => Math.round(value)
                }
            },
            scales: {
                x: {
                    display: false,
                    max: maxVal * 1.25
                },
                y: {
                    grid: { display: false, drawBorder: false },
                    ticks: {
                        color: '#2C3E50',
                        font: { size: 10, family: 'Helvetica' }
                    }
                }
            },
            animation: false // Keep it instant so it's ready for immediate printing
        }
    });
}
