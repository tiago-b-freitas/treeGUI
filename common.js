export class Vector2 {
    x;
    y;
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
    len(other) {
        return Math.sqrt((this.x - other.x) ** 2 + (this.y - other.y) ** 2);
    }
    scale(scalar) {
        return new Vector2(this.x * scalar, this.y * scalar);
    }
    sub(other) {
        return new Vector2(this.x - other.x, this.y - other.y);
    }
    add(other) {
        return new Vector2(this.x + other.x, this.y + other.y);
    }
    div(scalar) {
        return new Vector2(this.x / scalar, this.y / scalar);
    }
}
export class ElLine {
    el_key;
    el;
    constructor(el0, el1) {
        this.el_key = null;
        this.el = (document.createElementNS('http://www.w3.org/2000/svg', 'line'));
        this.move_to(el0, el1);
        this.el.setAttribute('stroke', 'white');
        this.el.setAttribute('stroke-width', '4');
        this.el.setAttribute('marker-start', 'url(#dot)');
        this.el.setAttribute('marker-end', 'url(#triangle)');
    }
    move_to(el0, el1) {
        if (el1 instanceof ElRect) {
            var [x1, y1, x2, y2] = el0.smallest_way_from_el(el1);
        }
        else if (el1 instanceof Vector2) {
            var [x1, y1, x2, y2] = el0.smallest_way_from_points(el1);
        }
        else {
            throw new Error(`Improper class ${el1.constructor.name}`);
        }
        this.el.setAttribute('x1', x1.toString());
        this.el.setAttribute('y1', y1.toString());
        this.el.setAttribute('x2', x2.toString());
        this.el.setAttribute('y2', y2.toString());
    }
}
export class ElRect {
    class_name;
    el;
    el_key = -1;
    childrens;
    x;
    y;
    w;
    h;
    start_points;
    left_point;
    right_point;
    top_point;
    bottom_point;
    constructor(x, y, w, h) {
        this.class_name = 'ElRect';
        let rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        this.el = rect;
        this.x = x;
        this.el.setAttribute('x', x.toString());
        this.y = y;
        this.el.setAttribute('y', y.toString());
        this.w = w;
        this.el.setAttribute('width', w.toString());
        this.h = h;
        this.el.setAttribute('height', h.toString());
        this.left_point = new Vector2(0, 0);
        this.right_point = new Vector2(0, 0);
        this.top_point = new Vector2(0, 0);
        this.bottom_point = new Vector2(0, 0);
        this.start_points = this.get_start_points();
        this.childrens = new Map();
    }
    get_start_points() {
        this.left_point.x = this.x;
        this.left_point.y = this.y + this.h / 2;
        this.right_point.x = this.x + this.w;
        this.right_point.y = this.y + this.h / 2;
        this.top_point.x = this.x + this.w / 2;
        this.top_point.y = this.y;
        this.bottom_point.x = this.x + this.w / 2;
        this.bottom_point.y = this.y + this.h;
        return [this.left_point, this.right_point, this.top_point, this.bottom_point];
    }
    move_to(coords) {
        this.x = coords.x;
        this.el.setAttribute('x', this.x.toString());
        this.y = coords.y;
        this.el.setAttribute('y', this.y.toString());
        this.start_points = this.get_start_points();
    }
    smallest_way_from_el(other) {
        var min = Infinity;
        var smallest_v = null;
        for (const v0 of this.start_points) {
            for (const v1 of other.start_points) {
                const len = v0.len(v1);
                if (len < min) {
                    min = len;
                    smallest_v = [v0.x, v0.y, v1.x, v1.y];
                }
            }
        }
        if (smallest_v === null)
            throw new Error('Is not possible to established the best way');
        return smallest_v;
    }
    smallest_way_from_points(other) {
        var min = Infinity;
        var smallest_v = null;
        for (const v0 of this.start_points) {
            const len = v0.len(other);
            if (len < min) {
                min = len;
                smallest_v = [v0.x, v0.y, other.x, other.y];
            }
        }
        if (smallest_v === null)
            throw new Error('Is not possible to established the best way');
        return smallest_v;
    }
}
export class Pool {
    el_key;
    pool;
    constructor() {
        this.el_key = 0;
        this.pool = new Map();
    }
    push(el, elements) {
        this.pool.set(this.el_key, el);
        if (this.el_key === null)
            throw new Error('The el_key is null');
        el.el.setAttribute('el_key', this.el_key.toString());
        this.el_key += 1;
        elements.appendChild(el.el);
        return this.el_key - 1;
    }
    get(el_key) {
        const el = this.pool.get(el_key);
        if (el === undefined)
            throw new Error(`El_key ${el_key} not found in pool ${this.pool}`);
        return el;
    }
    get_from_svg(el_svg) {
        const el_key = Number(el_svg.getAttribute('el_key'));
        return this.get(el_key);
    }
    remove(el_key, elements) {
        elements.removeChild(this.get(el_key).el);
        this.pool.delete(el_key);
    }
}
// https://dev.to/jeetvora331/throttling-in-javascript-easiest-explanation-1081
export function throttle(func, delay) {
    let timer_flag = null;
    return (...args) => {
        if (timer_flag === null) {
            func(...args);
            timer_flag = setTimeout(() => {
                timer_flag = null;
            }, delay);
        }
    };
}
export function getRandomRange(min, max) {
    return Math.random() * (max - min) + min;
}
