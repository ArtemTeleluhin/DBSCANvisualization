import * as Actions from "./actions.js";
import * as Metrics from "./metrics.js";

export class Stack {
    constructor() {
        this.data = [];
    }

    add(elem) {
        this.data.push(elem);
    }

    get() {
        return this.data.pop();
    }

    clear() {
        this.data = [];
    }

    isEmpty() {
        return this.data.length === 0;
    }
}

export class Queue {
    constructor() {
        this.data = [];
    }

    add(elem) {
        this.data.push(elem);
    }

    get() {
        return this.data.shift();
    }

    clear() {
        this.data = [];
    }

    isEmpty() {
        return this.data.length === 0;
    }
}

export class DBSCANInterface {
    clusterize(points, metric, eps, min_points, container) {
        return null;
    }
}

export class PrimitiveDBSCAN extends DBSCANInterface {
    clusterize(points, metric, eps, min_points, container) {
        let n = points.length;
        let clusters = new Array(n).fill(0);
        let k = 0;
        let actions = new Actions.ActionsList();
        for (let i = 0; i < n; i++) {
            if (clusters[i]) {
                continue;
            }
            actions.add(new Actions.ProcessingBegin(i, eps));
            let neighbors = [];
            for (let j = i + 1; j < n; j++) {
                if (clusters[j]) {
                    continue;
                }
                if (metric.count_distance(points[i], points[j]) <= eps) {
                    neighbors.push(j);
                    actions.add(new Actions.AddEdge(i, j));
                }
            }
            if (neighbors.length === 0) {
                actions.add(new Actions.ProcessingEnd(i));
                continue;
            }
            k++;
            clusters[i] = k;
            actions.add(new Actions.AddInCluster(i, k));
            container.clear();
            for (let j = 0; j < neighbors.length; j++) {
                container.add(neighbors[j]);
                clusters[neighbors[j]] = k;
                actions.add(new Actions.AddInCluster(neighbors[j], k));
            }
            actions.add(new Actions.ProcessingEnd(i));
            let edges = new Set();
            while (!container.isEmpty()) {
                let x = container.get();
                actions.add(new Actions.ProcessingBegin(x, eps));
                for (let y = i + 1; y < n; y++) {
                    if (y == x) continue;
                    if (metric.count_distance(points[x], points[y]) <= eps) {
                        let key = [Math.min(x, y), Math.max(x, y)].join(',');
                        if (edges.has(key)) {
                            continue;
                        }
                        edges.add(key);
                        actions.add(new Actions.AddEdge(x, y));
                        if (clusters[y]) {
                            continue;
                        }
                        container.add(y);
                        clusters[y] = k;
                        actions.add(new Actions.AddInCluster(y, k));
                    }
                }
                actions.add(new Actions.ProcessingEnd(x));
            }
        }
        return {k, clusters, actions};
    }
}


export class ClassicDBSCAN extends DBSCANInterface {
    findNeighbors(v, points, metric, eps) {
        let neighbors = []
        for (let i = 0; i < points.length; i++) {
            if (i != v && metric.count_distance(points[i], points[v]) <= eps) {
                neighbors.push(i);
            }
        }
        return neighbors;
    }

    addEdge(x, y) {
        let key = [Math.min(x, y), Math.max(x, y)].join(',');
        if (!this.edges.has(key)) {
            this.edges.add(key);
            this.actions.add(new Actions.AddEdge(x, y));
        }
    }

    clusterize(points, metric, eps, min_points, container) {
        let n = points.length;
        let clusters = new Array(n).fill(0);
        let k = 0;
        this.actions = new Actions.ActionsList();
        this.edges = new Set();
        for (let i = 0; i < n; i++) {
            if (clusters[i]) {
                continue;
            }
            this.actions.add(new Actions.ProcessingBegin(i, eps));
            let neighbors = this.findNeighbors(i, points, metric, eps);
            for (let j = 0; j < neighbors.length; j++) {
                this.addEdge(neighbors[j], i);
            }
            if (neighbors.length + 1 < min_points) {
                this.actions.add(new Actions.ProcessingEnd(i));
                continue;
            }
            k++;
            clusters[i] = k;
            this.actions.add(new Actions.AddInCluster(i, k));
            container.clear();
            for (let j = 0; j < neighbors.length; j++) {
                container.add(neighbors[j]);
                clusters[neighbors[j]] = k;
                this.actions.add(new Actions.AddInCluster(neighbors[j], k));
            }
            this.actions.add(new Actions.ProcessingEnd(i));
            while (!container.isEmpty()) {
                let x = container.get();
                this.actions.add(new Actions.ProcessingBegin(x, eps));
                neighbors = this.findNeighbors(x, points, metric, eps);
                for (let j = 0; j < neighbors.length; j++) {
                    this.addEdge(neighbors[j], x);
                }
                if (neighbors.length + 1 >= min_points) {
                    for (let j = 0; j < neighbors.length; j++) {
                        if (clusters[neighbors[j]] == 0) {
                            container.add(neighbors[j]);
                            clusters[neighbors[j]] = k;
                            this.actions.add(new Actions.AddInCluster(neighbors[j], k));
                        }
                    }
                }
                this.actions.add(new Actions.ProcessingEnd(x));
            }
        }
        let actions = this.actions;
        return {k, clusters, actions};
    }
}