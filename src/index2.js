import * as Actions from "./actions.js";
import * as Metrics from "./metrics.js";
import * as DBSCAN from "./DBSCAN.js";
import {Queue, Stack} from "./DBSCAN.js";

const COLORS = [
    '#000000', '#FF0000', '#0000FF',
    '#00FF00', '#FF7000', '#800080',
    '#674020', '#606000', '#006000',
    '#00FFFF', '#800000', '#fbff00',
    '#d15ca6', '#a4e647', '#c24848',
    '#1c2c73', '#9ea100'
];

function getColor(num) {
    if (num < COLORS.length) return COLORS[num];
    num = num - COLORS.length;
    num = (num * 3547 + 73) % 599;
    num = (num * 193 + 467) % 709;
    let t = (num % 50) / 50;
    let r = Math.sin(2 * Math.PI * t) * 127 + 128;
    let g = Math.sin(2 * Math.PI * t + t + 1.0) * 127 + 128;
    let b = Math.sin(2 * Math.PI * t + 2.0 / t + 1.5) * 127 + 128;
    r = Math.round(r).toString(16).padStart(2, '0');
    g = Math.round(g).toString(16).padStart(2, '0');
    b = Math.round(b).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`;
}

let datasets = {};

fetch('datasets_2.json')
    .then(response => {
        if (!response.ok) {
            throw new Error('Ошибка загрузки');
        }
        return response.json();
    })
        .then(data => {
            datasets = data;
        })
        .catch(error => {
            console.error('Ошибка:', error);
        });

class App {
    constructor() {
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        let clientRect = this.canvas.getBoundingClientRect();
        this.cellSize = 50;
        this.canvas.width = clientRect.width;
        this.canvas.height = clientRect.height;
        this.width = this.canvas.width;
        this.height = this.canvas.height;

        this.metrics = {
            euclidean: new Metrics.EuclideanDistance(),
            manhattan: new Metrics.ManhattanDistance(),
            chebyshev: new Metrics.ChebyshevDistance()
        };

        this.algorithms = {
            primitive: new DBSCAN.PrimitiveDBSCAN(),
            advanced: new DBSCAN.ClassicDBSCAN()
        };

        this.searches = {
            BFS: new Queue(),
            DFS: new Stack()
        };

        this.points = [];
        this.pointsColors = [];
        this.lines = [];
        this.steps = null;
        this.currentStep = 0;
        this.searchArea = null;
        this.animatedMetric = null;

        this.isRunning = false;
        this.isPaused = false;
        this.animationInterval = null;

        this.addDeleteStatus = true;
        this.recentActions = [];

        this.init();
    }

    init() {
        this.canvas.addEventListener('click', (e) => {
            if (this.addDeleteStatus) {
                this.addPoint(e)
            }
            else {
                this.delPoint(e);
            }
        });

        for (let elem of document.getElementsByName('metric')) {
            elem.addEventListener('change', () => {
                this.drawCanvas();
            });
        }

        document.getElementById('eps').addEventListener('input', (e) => {
            document.getElementById('epsValue').textContent = e.target.value;
            this.drawCanvas();
        });
        document.getElementById('neighbours').addEventListener('input', (e) => {
            document.getElementById('neighboursValue').textContent = e.target.value;
        });
        document.getElementById('speed').addEventListener('input', (e) => {
            document.getElementById('speedValue').textContent = e.target.value;
            this.updateSpeed();
        });

        document.getElementById('toBegin').addEventListener('click', () => {
            this.toFirstStep();
        });
        document.getElementById('previousStep').addEventListener('click', () => {
            this.previousStep();
        });
        document.getElementById('startPause').addEventListener('click', () => {
            this.clickStartPause();
        });
        document.getElementById('nextStep').addEventListener('click', () => {
            this.nextStep();
        });
        document.getElementById('toEnd').addEventListener('click', () => {
            this.toLastStep();
        });

        document.getElementById('addDelete').addEventListener('click', () => {
            this.switchAddDelete();
        });
        document.getElementById('cancel').addEventListener('click', () => {
            this.cancelAction();
        });
        document.getElementById('clear').addEventListener('click', () => {
            this.clearAll();
        });

        document.getElementById('edges').addEventListener('click', () => {
            this.drawCanvas();
        });
        document.getElementById('area').addEventListener('click', () => {
            this.drawCanvas();
        });
        document.getElementById('grid').addEventListener('click', () => {
            this.drawCanvas();
        });
        document.getElementById('indicator').addEventListener('click', () => {
            this.drawCanvas();
        });

        document.getElementById('datasets').addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON') {
                this.loadDataset(e.target.id);
            }
        });

        this.drawCanvas();
    }

    getCurrentMetric() {
        return document.querySelector('input[name="metric"]:checked').value;
    }

    getCurrentAlgorithm() {
        return document.querySelector('input[name="algorithm"]:checked').value;
    }

    getCurrentSearch() {
        return document.querySelector('input[name="search"]:checked').value;
    }

    getCurrentEps() {
        return parseInt(document.getElementById('eps').value);
    }

    getCurrentSpeed() {
        return parseInt(document.getElementById('speed').value);
    }

    getCurrentNeighbours() {
        return parseInt(document.getElementById('neighbours').value);
    }

    getNeedDrawEdges() {
        return document.getElementById('edges').checked;
    }

    getNeedDrawSearchArea() {
        return document.getElementById('area').checked;
    }

    getNeedDrawGrid() {
        return document.getElementById('grid').checked;
    }

    getNeedDrawSearchIndicator() {
        return document.getElementById('indicator').checked;
    }

    drawCanvas() {
        this.drawGrid();
        this.drawSearching();
        this.drawLines();
        this.drawPoints();
    }

    drawLine(x1, y1, x2, y2, color, width) {
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = width;
        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.stroke();
    }

    drawCircle(cx, cy, r, color, stroke=null, strokeColor=null) {
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, r, 0, 2 * Math.PI);
        this.ctx.fillStyle = color;
        this.ctx.fill();
        if (stroke) {
            this.ctx.strokeStyle = strokeColor;
            this.ctx.lineWidth = stroke;
            this.ctx.stroke();
        }
    }

    drawSquare(cx, cy, r, color, stroke=null, strokeColor=null) {
        this.ctx.beginPath();
        this.ctx.rect(cx - r, cy - r, 2 * r + 1, 2 * r + 1);
        this.ctx.fillStyle = color;
        this.ctx.fill();
        if (stroke) {
            this.ctx.strokeStyle = strokeColor;
            this.ctx.lineWidth = stroke;
            this.ctx.stroke();
        }
    }

    drawRhombus(cx, cy, r, color, stroke=null, strokeColor=null) {
        this.ctx.beginPath();
        this.ctx.moveTo(cx + r, cy);
        this.ctx.lineTo(cx, cy + r);
        this.ctx.lineTo(cx - r, cy);
        this.ctx.lineTo(cx, cy - r);
        this.ctx.closePath();
        this.ctx.fillStyle = color;
        this.ctx.fill();
        if (stroke) {
            this.ctx.strokeStyle = strokeColor;
            this.ctx.lineWidth = stroke;
            this.ctx.stroke();
        }
    }

    drawSearchArea(cx, cy, r, color, metric) {
        if (metric === 'euclidean') {
            this.drawCircle(cx, cy, r, color + 'C0', 2, '#000');
        }
        else if (metric === 'manhattan') {
            this.drawRhombus(cx, cy, r, color + 'C0', 2, '#000');
        }
        else if (metric === 'chebyshev') {
            this.drawSquare(cx, cy, r, color + 'C0', 2, '#000');
        }
    }

    drawGrid() {
        this.ctx.clearRect(0, 0, this.width, this.height);
        if (this.getNeedDrawGrid()) {
            for (let x = 0; x < this.width; x += this.cellSize) {
                this.drawLine(x, 0, x, this.height, '#e0e0e0', 0.5);
            }
            for (let y = 0; y < this.height; y += this.cellSize) {
                this.drawLine(0, y, this.width, y, '#e0e0e0', 0.5);
            }
        }
    }

    drawPoints() {
        for (let i = 0; i < this.points.length; i++) {
            this.drawCircle(this.points[i][0], this.points[i][1], 8, this.pointsColors[i], 2, '#000');
        }
    }

    drawLines() {
        if (this.getNeedDrawEdges()) {
            for (let i = 0; i < this.lines.length; i++) {
                this.drawLine(this.lines[i][0], this.lines[i][1],
                    this.lines[i][2], this.lines[i][3], '#000', 3);
            }
        }
    }

    drawSearching() {
        if (this.getNeedDrawSearchIndicator()) {
            this.drawSearchArea(0, 0, this.getCurrentEps(), '#000000', this.getCurrentMetric());
        }
        if (this.searchArea && this.getNeedDrawSearchArea()) {
            let vertex = this.searchArea[0];
            let eps = this.searchArea[1];
            this.drawSearchArea(this.points[vertex][0], this.points[vertex][1],
                eps, this.pointsColors[vertex], this.animatedMetric);
        }
    }

    addPoint(event) {
        let clientRect = this.canvas.getBoundingClientRect();
        let normX = this.canvas.width / clientRect.width;
        let normY = this.canvas.height / clientRect.height;
        let x = (event.clientX - clientRect.left) * normX;
        let y = (event.clientY - clientRect.top) * normY;
        this.recentActions.push([this.points.slice(), this.pointsColors.slice()]);
        if (this.recentActions.length > 10) {
            this.recentActions.shift();
        }
        this.points.push([x, y]);
        this.pointsColors.push('#000000');
        this.drawCanvas();
    }

    delPoint(event) {
        if (this.points.length === 0) return;
        let clientRect = this.canvas.getBoundingClientRect();
        let normX = this.canvas.width / clientRect.width;
        let normY = this.canvas.height / clientRect.height;
        let x = (event.clientX - clientRect.left) * normX;
        let y = (event.clientY - clientRect.top) * normY;
        let ind = -1;
        let min_dist = 25;
        for (let i = 0; i < this.points.length; i++) {
            let dist = this.metrics['euclidean'].count_distance([x, y], this.points[i]);
            if (dist < min_dist) {
                ind = i;
                min_dist = dist;
            }
        }
        if (ind !== -1) {
            this.recentActions.push([this.points.slice(), this.pointsColors.slice()]);
            if (this.recentActions.length > 10) {
                this.recentActions.shift();
            }
            this.points.splice(ind, 1);
            this.pointsColors.splice(ind, 1);
            this.drawCanvas();
        }
    }

    makeButtonStart() {
        let button = document.getElementById('startPause');
        button.textContent = '▶';
        button.style.background = '#4caf50';
    }

    makeButtonPause() {
        let button = document.getElementById('startPause');
        button.textContent = '⏸';
        button.style.background = '#ff9800';
    }

    clickStartPause() {
        if (this.isRunning) {
            if (this.isPaused) {
                this.isPaused = false;
                this.makeButtonPause();
            }
            else {
                this.isPaused = true;
                this.makeButtonStart();
            }
        }
        else {
            this.isRunning = true;
            this.isPaused = false;
            this.makeButtonPause();
            this.startAnimation();
        }
    }

    startAnimation() {
        if (this.animationInterval) {
            clearInterval(this.animationInterval);
        }
        this.doAlgorithm();
        this.currentStep = 0;
        let speed = 5000 / this.getCurrentSpeed();
        this.animationInterval = setInterval(() => this.animationStep(), speed);
    }

    stopAnimation() {
        this.isRunning = false;
        this.isPaused = false;
        this.makeButtonStart();
    }

    updateSpeed() {
        if (this.animationInterval) {
            clearInterval(this.animationInterval);
            this.animationInterval = null;
        }
        if (this.isRunning) {
            let speed = 5000 / this.getCurrentSpeed();
            this.animationInterval = setInterval(() => this.animationStep(), speed);
        }
    }

    animationStep() {
        if (this.isRunning && !this.isPaused) {
            this.nextStep();
        }
    }

    nextStep() {
        if (this.steps === null) {
            return;
        }
        if (this.currentStep === this.steps.length) {
            return;
        }
        while (this.currentStep < this.steps.length) {
            this.currentStep++;
            if (this.steps[this.currentStep - 1] instanceof Actions.AddEdge) {
                if (this.getNeedDrawEdges()) break;
            }
            else if (!(this.steps[this.currentStep - 1] instanceof Actions.AddInCluster)) {
                if (this.getNeedDrawSearchArea()) break;
            }
            else {
                break;
            }
        }
        this.updateVisualization();
        if (this.currentStep === this.steps.length) {
            this.stopAnimation();
        }
    }

    previousStep() {
        if (this.steps === null) {
            return;
        }
        if (this.currentStep === 0) {
            return;
        }
        while (this.currentStep > 0) {
            this.currentStep--;
            if (this.steps[this.currentStep] instanceof Actions.AddEdge) {
                if (this.getNeedDrawEdges()) break;
            }
            else if (!(this.steps[this.currentStep] instanceof Actions.AddInCluster)) {
                if (this.getNeedDrawSearchArea()) break;
            }
            else {
                break;
            }
        }
        this.updateVisualization();
    }

    toFirstStep() {
        if (this.steps === null) {
            return;
        }
        if (this.isRunning) {
            this.currentStep = 0;
            this.updateVisualization();
        }
        else {
            this.makeButtonPause();
            this.isRunning = true;
            this.startAnimation();
        }
    }

    toLastStep() {
        if (this.steps === null) {
            return;
        }
        this.currentStep = this.steps.length;
        this.stopAnimation();
        this.updateVisualization();
    }

    updateVisualization() {
        for (let i = 0; i < this.points.length; i++) {
            this.pointsColors[i] = '#000000';
        }
        this.lines = [];
        this.searchArea = null;
        for (let i = 0; i < this.currentStep; i++) {
            let action = this.steps[i];
            if (action instanceof Actions.AddInCluster) {
                let vertex = action.vertex;
                let cluster = action.cluster;
                this.pointsColors[vertex] = getColor(cluster);
            }
            else if (action instanceof Actions.AddEdge) {
                let vertex_from = action.vertex_from;
                let vertex_to = action.vertex_to;
                let x1 = this.points[vertex_from][0];
                let y1 = this.points[vertex_from][1];
                let x2 = this.points[vertex_to][0];
                let y2 = this.points[vertex_to][1];
                this.lines.push([x1, y1, x2, y2]);
            }
            else if (action instanceof Actions.ProcessingBegin) {
                let vertex = action.vertex;
                let eps = action.radius;
                this.searchArea = [vertex, eps];
            }
            else if (action instanceof Actions.ProcessingEnd) {
                this.searchArea = null;
            }
        }
        this.drawCanvas();
    }

    doAlgorithm() {
        if (this.points.length > 0) {
            this.animatedMetric = this.getCurrentMetric();
            let eps = this.getCurrentEps();
            let min_points = this.getCurrentNeighbours();
            let algorithm = this.getCurrentAlgorithm();
            let search = this.getCurrentSearch();
            this.steps = this.algorithms[algorithm].clusterize(
                this.points,
                this.metrics[this.animatedMetric],
                eps,
                min_points,
                this.searches[search]
            ).actions.get_list();
        }
    }

    clearAll() {
        this.stopAnimation();
        this.recentActions.push([this.points.slice(), this.pointsColors.slice()]);
        if (this.recentActions.length > 10) {
            this.recentActions.shift();
        }
        this.points = [];
        this.pointsColors = [];
        this.lines = [];
        this.steps = null;
        this.currentStep = 0;
        this.searchArea = null;
        this.animatedMetric = null;
        this.drawCanvas();
    }

    switchAddDelete() {
        if (this.addDeleteStatus) {
            this.addDeleteStatus = false;
            document.getElementById('addDelete').textContent = 'Добавление вершин';
        }
        else {
            this.addDeleteStatus = true;
            document.getElementById('addDelete').textContent = 'Удаление вершин';
        }
    }

    cancelAction() {
        if (this.recentActions.length > 0) {
            [this.points, this.pointsColors] = this.recentActions.pop();
            this.drawCanvas();
        }
    }

    loadDataset(name) {
        this.clearAll();
        this.points = datasets[name];
        this.pointsColors = Array(this.points.length).fill('#000000');
        this.drawCanvas();
    }
}

window.addEventListener('DOMContentLoaded', () => {
    new App();
});