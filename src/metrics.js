export class Metric {
    count_distance(point_1, point_2) {
        return null;
    }
}

export class EuclideanDistance extends Metric {
    count_distance(point_1, point_2) {
        let res = 0.0;
        for (let i = 0; i < point_1.length; i++) {
            res += (point_1[i] - point_2[i]) * (point_1[i] - point_2[i]);
        }
        return Math.sqrt(res);
    }
}

export class ManhattanDistance extends Metric {
    count_distance(point_1, point_2) {
        let res = 0.0;
        for (let i = 0; i < point_1.length; i++) {
            res += Math.abs(point_1[i] - point_2[i]);
        }
        return res;
    }
}

export class ChebyshevDistance extends Metric {
    count_distance(point_1, point_2) {
        let res = 0.0;
        for (let i = 0; i < point_1.length; i++) {
            res = Math.max(res, Math.abs(point_1[i] - point_2[i]));
        }
        return res;
    }
}