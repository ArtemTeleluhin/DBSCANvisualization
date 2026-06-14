import * as Actions from "./actions.js";
import * as Metrics from "./metrics.js";
import * as DBSCAN from "./DBSCAN.js";

const COLORS = [
    '#000000', '#FF0000', '#0000FF',
    '#00FF00', '#FF7000', '#800080',
    '#674020', '#606000', '#006000',
    '#00FFFF', '#800000'
];

class GeometryApp {
    constructor() {
        console.log('constructor');
        this.canvas = document.getElementById('planeCanvas');
        this.ctx = this.canvas.getContext('2d');

        // Параметры сетки
        this.cellSize = 50;
        this.width = this.canvas.width;
        this.height = this.canvas.height;

        // Данные
        this.circles = []; // массив кругов {x, y}
        this.colors = [];
        this.lines = []; // массив линий {x1, y1, x2, y2}
        this.actions = null;
        this.special = null;
        this.special_metric = "euclidean";

        // Состояние анимации
        this.animationInterval = null;
        this.isRunning = false;
        this.isPaused = false;

        // Настройки
        this.metrics = {
            euclidean: new Metrics.EuclideanDistance(),
            manhattan: new Metrics.ManhattanDistance(),
            chebyshev: new Metrics.ChebyshevDistance()
        };

        this.init();
    }

    init() {
        // Привязка событий
        this.canvas.addEventListener('click', (e) => this.addCircle(e));
        document.getElementById('startPauseBtn').addEventListener('click', () => this.toggleAnimation());
        document.getElementById('clearBtn').addEventListener('click', () => this.clearAll());
        document.getElementById('eps').addEventListener('input', (e) => {
            document.getElementById('epsValue').textContent = e.target.value;
            this.drawGrid();
        });
        document.getElementById('speed').addEventListener('input', (e) => {
            document.getElementById('speedValue').textContent = e.target.value;
            if (this.animationInterval) {
                clearInterval(this.animationInterval);
                this.animationInterval = null;
            }
            if (this.isRunning) {
                const speed = parseInt(document.getElementById('speed').value);
                this.animationInterval = setInterval(() => this.animationStep(), speed);
            }
        });

        document.getElementById('euclidean').addEventListener('change', () => {
            this.drawGrid();
        });
        document.getElementById('manhattan').addEventListener('change', () => {
            this.drawGrid();
        });
        document.getElementById('chebyshev').addEventListener('change', () => {
            this.drawGrid();
        });

        this.drawGrid();
    }

    drawGrid() {
        this.ctx.clearRect(0, 0, this.width, this.height);

        // Рисуем клетчатую сетку
        this.ctx.strokeStyle = '#e0e0e0';
        this.ctx.lineWidth = 0.5;

        // Вертикальные линии
        for (let x = 0; x <= this.width; x += this.cellSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.height);
            this.ctx.stroke();
        }

        // Горизонтальные линии
        for (let y = 0; y <= this.height; y += this.cellSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.width, y);
            this.ctx.stroke();
        }

        // Рисуем все круги и линии
        this.drawSpecialArea();
        this.drawLines();
        this.drawCircles();
    }

    drawSpecialArea() {
        let eps = parseInt(document.getElementById('eps').value);
        if (this.getCurrentMetric() instanceof Metrics.EuclideanDistance) {
            this.ctx.beginPath();
            this.ctx.arc(0, 0, eps, 0, 2 * Math.PI);
            this.ctx.fillStyle = '#00000080';
            this.ctx.fill();
            this.ctx.strokeStyle = '#000000';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
        }
        else if (this.getCurrentMetric() instanceof Metrics.ManhattanDistance) {
            this.ctx.beginPath();
            this.ctx.moveTo(eps, 0);
            this.ctx.lineTo(0, eps);
            this.ctx.lineTo(-eps, 0);
            this.ctx.lineTo(0, -eps);
            this.ctx.closePath();
            this.ctx.fillStyle = '#00000080';
            this.ctx.fill();
            this.ctx.strokeStyle = '#000000';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
        }
        else if (this.getCurrentMetric() instanceof Metrics.ChebyshevDistance) {
            this.ctx.beginPath();
            this.ctx.rect(-eps, -eps, 2 * eps + 1, 2 * eps + 1);
            this.ctx.fillStyle = '#00000080';
            this.ctx.fill();
            this.ctx.strokeStyle = '#000000';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
        }

        if (this.special === null) {
            return;
        }
        let i = this.special.vertex;
        eps = this.special.eps;
        if (this.special_metric === "euclidean") {
            this.ctx.beginPath();
            this.ctx.arc(this.circles[i].x, this.circles[i].y, eps, 0, 2 * Math.PI);
            this.ctx.fillStyle = this.colors[i] + 'C0';
            this.ctx.fill();
            this.ctx.strokeStyle = '#000000';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
        }
        else if (this.special_metric === "manhattan") {
            let x = this.circles[i].x;
            let y = this.circles[i].y;
            this.ctx.beginPath();
            this.ctx.moveTo(x + eps, y);
            this.ctx.lineTo(x, y + eps);
            this.ctx.lineTo(x - eps, y);
            this.ctx.lineTo(x, y - eps);
            this.ctx.closePath();
            this.ctx.fillStyle = this.colors[i] + 'C0';
            this.ctx.fill();
            this.ctx.strokeStyle = '#000000';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
        }
        else if (this.special_metric === "chebyshev") {
            let x = this.circles[i].x;
            let y = this.circles[i].y;
            this.ctx.beginPath();
            this.ctx.rect(x - eps, y - eps, 2 * eps + 1, 2 * eps + 1);
            this.ctx.fillStyle = this.colors[i] + 'C0';
            this.ctx.fill();
            this.ctx.strokeStyle = '#000000';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
        }
    }

    drawCircles() {
        for (let i = 0; i < this.circles.length; i++) {
            this.ctx.beginPath();
            this.ctx.arc(this.circles[i].x, this.circles[i].y, 8, 0, 2 * Math.PI);
            this.ctx.fillStyle = this.colors[i];
            this.ctx.fill();
            this.ctx.strokeStyle = '#000000';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
        }
    }

    drawLines() {
        for (let i = 0; i < this.lines.length; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(this.lines[i].x1, this.lines[i].y1);
            this.ctx.lineTo(this.lines[i].x2, this.lines[i].y2);
            this.ctx.strokeStyle = '#000000';
            this.ctx.lineWidth = 3;
            this.ctx.stroke();
        }
    }

    addCircle(event) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;

        const x = (event.clientX - rect.left) * scaleX;
        const y = (event.clientY - rect.top) * scaleY;

        this.circles.push({x, y});
        this.colors.push('#000000');
        this.drawGrid();
    }

    getCurrentMetric() {
        const selected = document.querySelector('input[name="metric"]:checked').value;
        return this.metrics[selected];
    }

    updateDrawing() {
        if (this.actions == null) {
            return;
        }
        if (this.actions.is_end()) {
            this.stopAnimation();
            this.isRunning = false;
            document.getElementById('startPauseBtn').textContent = '▶ Старт';
            document.getElementById('startPauseBtn').style.background = '#4caf50';
            return;
        }

        let action = this.actions.next();
        if (action instanceof Actions.AddInCluster) {
            let vertex = action.vertex;
            let cluster = action.cluster;
            cluster = cluster % 10;
            if (cluster === 0) cluster = 10;
            this.colors[vertex] = COLORS[cluster];
        }
        else if (action instanceof Actions.AddEdge) {
            let vertex_from = action.vertex_from;
            let vertex_to = action.vertex_to;
            let x1 = this.circles[vertex_from].x;
            let y1 = this.circles[vertex_from].y;
            let x2 = this.circles[vertex_to].x;
            let y2 = this.circles[vertex_to].y;
            this.lines.push({x1, y1, x2, y2});
        }
        else if (action instanceof Actions.ProcessingBegin) {
            let vertex = action.vertex;
            let eps = action.radius;
            this.special = {vertex, eps};
        }
        else if (action instanceof Actions.ProcessingEnd) {
            this.special = null;
        }

        this.drawGrid();
    }

    animationStep() {
        if (!this.isRunning || this.isPaused) return;
        this.updateDrawing();
    }

    startAnimation() {
        if (this.animationInterval) {
            clearInterval(this.animationInterval);
        }

        let algorithm = new DBSCAN.PrimitiveDBSCAN();
        let points = [];
        for (let i = 0; i < this.circles.length; i++) {
            points.push([this.circles[i].x, this.circles[i].y]);
        }
        if (points.length > 0) {
            let eps = parseInt(document.getElementById('eps').value);
            this.actions = algorithm.clusterize(points, this.getCurrentMetric(), eps, 0).actions;
            for (let i = 0; i < this.colors.length; i++) {
                this.colors[i] = '#000000';
            }
            this.lines = [];
            if (this.getCurrentMetric() instanceof Metrics.EuclideanDistance) {
                this.special_metric = "euclidean";
            }
            else if (this.getCurrentMetric() instanceof Metrics.ManhattanDistance) {
                this.special_metric = "manhattan";
            }
            else if (this.getCurrentMetric() instanceof Metrics.ChebyshevDistance) {
                this.special_metric = "chebyshev";
            }
        }

        const speed = parseInt(document.getElementById('speed').value);

        this.animationInterval = setInterval(() => this.animationStep(), speed);
        this.isRunning = true;

        // Первый шаг сразу
        this.updateDrawing();
    }

    stopAnimation() {
        if (this.animationInterval) {
            clearInterval(this.animationInterval);
            this.animationInterval = null;
        }
        this.isRunning = false;
    }

    toggleAnimation() {
        const btn = document.getElementById('startPauseBtn');

        if (this.isRunning) {
            if (this.isPaused) {
                this.isPaused = false;
                btn.textContent = '⏸ Пауза';
                btn.style.background = '#ff9800';
            } else {
                this.isPaused = true;
                btn.textContent = '▶ Старт';
                btn.style.background = '#4caf50';
            }
        } else {
            this.startAnimation();
            btn.textContent = '⏸ Пауза';
            btn.style.background = '#ff9800';
        }
    }

    clearAll() {
        this.stopAnimation();
        this.isPaused = false;
        this.circles = [];
        this.colors = [];
        this.lines = [];
        this.actions = null;
        this.special = null;
        this.drawGrid();

        const btn = document.getElementById('startPauseBtn');
        btn.textContent = '▶ Старт';
        btn.style.background = '#4caf50';
        this.isRunning = false;
    }
}

// Инициализация приложения после загрузки страницы
window.addEventListener('DOMContentLoaded', () => {
    new GeometryApp();
});