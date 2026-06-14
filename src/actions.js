export class Action {
}

export class ProcessingBegin extends Action {
    constructor(vertex, radius) {
        super();
        this.vertex = vertex;
        this.radius = radius;
    }
}

export class AddEdge extends Action {
    constructor(vertex_from, vertex_to) {
        super();
        this.vertex_from = vertex_from;
        this.vertex_to = vertex_to;
    }
}

export class AddInCluster extends Action {
    constructor(vertex, cluster) {
        super();
        this.vertex = vertex;
        this.cluster = cluster;
    }
}

export class ProcessingEnd extends Action {
    constructor(vertex) {
        super();
        this.vertex = vertex;
    }
}

export class ActionsList {
    constructor() {
        this.list = [];
        this.i = 0;
    }

    add(action) {
        this.list.push(action);
    }

    get_list() {
        return this.list;
    }

    next() {
        if (this.i === this.list.length) {
            return null;
        }
        this.i++;
        return this.list[this.i - 1];
    }

    is_end() {
        return this.i === this.list.length;
    }
}