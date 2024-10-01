var seed = 69;
function random(): number {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
}
function getRandomRange(min: number, max: number): number {
    return Math.random() * (max - min) + min;
}

type ElKey = number;
type lineType = 's' | 'e';
type SVGTypes = SVGRectElement;
type El = ElRect | ElLine;
type Board = {
    svg: HTMLElement;
    pool: Pool;
}

type ElPool = Map<number, El>;

class Pool {
    el_key: ElKey;
    pool: ElPool;
    constructor() {
        this.el_key = 0;
        this.pool = new Map();
    }
    public push(el: El, svg: HTMLElement): number {
        this.pool.set(this.el_key, el);
        el.el.setAttribute('el_key', this.el_key.toString());
        this.el_key += 1;
        svg.appendChild(el.el);
        return this.el_key - 1;
    }
    public get(el_key: ElKey): El {
        const el = this.pool.get(el_key);
        if (el === undefined) throw new Error(`El_key ${el_key} not found in pool ${this.pool}`);
        return el;
    }
    public get_from_svg(el_svg: SVGElement): El {
        const el_key = Number(el_svg.getAttribute('el_key'));
        return this.get(el_key);
    }
    public remove(el_key: ElKey, svg: HTMLElement): void {
        svg.removeChild(this.get(el_key).el);
        this.pool.delete(el_key);
    }
}

class ElLine {
    public el_key: ElKey = -1;
    public el: SVGLineElement
    constructor(el0: ElRect, el1: ElRect) {
        this.el = (document.createElementNS('http://www.w3.org/2000/svg', 'line'));
        this.move_to(el0, el1);
        this.el.setAttribute('stroke', 'white');
        this.el.setAttribute('stroke-width', '4');
        this.el.setAttribute('marker-start', 'url(#dot)');
        this.el.setAttribute('marker-end', 'url(#triangle)');

    }
    public move_to(el0: ElRect, el1: ElRect): void {
        const [x1, y1, x2, y2] = el0.smallest_way(el1)
        this.el.setAttribute('x1', x1.toString());
        this.el.setAttribute('y1', y1.toString());
        this.el.setAttribute('x2', x2.toString());
        this.el.setAttribute('y2', y2.toString());
    }
}

class Vector2 {
    x: number;
    y: number;
    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }
    public len(other: Vector2): number {
        return Math.sqrt((this.x - other.x)**2 + (this.y - other.y)**2);
    }
}

type StartPoints = [Vector2, Vector2, Vector2, Vector2];

class ElRect {
    el: SVGRectElement;
    el_key: ElKey = -1;
    childrens: [lineType, ElKey, ElKey][];
    public x: number;
    public y: number;
    public w: number;
    public h: number;
    private start_points: StartPoints;
    private left_point: Vector2;
    private right_point: Vector2;
    private top_point: Vector2;
    private bottom_point: Vector2;
    constructor(x: number, y: number, w: number, h: number) {
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

        this.left_point   = new Vector2(0, 0);
        this.right_point  = new Vector2(0, 0);
        this.top_point    = new Vector2(0, 0);
        this.bottom_point = new Vector2(0, 0);
        this.start_points = this.get_start_points();

        this.childrens = [];
    }
    private get_start_points(): StartPoints {
        this.left_point.x = this.x;
        this.left_point.y = this.y + this.h/2;

        this.right_point.x  = this.x + this.w; 
        this.right_point.y  = this.y + this.h/2;

        this.top_point.x    = this.x + this.w/2;
        this.top_point.y    = this.y;

        this.bottom_point.x = this.x + this.w/2;
        this.bottom_point.y = this.y + this.h;

        return [this.left_point, this.right_point, this.top_point, this.bottom_point];
    }
    public move_to(x: number, y: number): void {
        this.x = x;
        this.el.setAttribute('x', x.toString());
        this.y = y;
        this.el.setAttribute('y', y.toString());
        this.start_points = this.get_start_points();
    }
    public smallest_way(other: ElRect): [number, number, number, number] {
        var min = Infinity;
        var smallest_v: [number, number, number, number] | null = null;
        for (const v0 of this.start_points) {
                for (const v1 of other.start_points) {
                const len = v0.len(v1);
                if (len < min) {
                    min = len;
                    smallest_v = [v0.x, v0.y, v1.x, v1.y];
                }
            }
        }
        if (smallest_v === null) throw new Error('Is not possible to established the best way');
        return smallest_v;
    }
}

// https://dev.to/jeetvora331/throttling-in-javascript-easiest-explanation-1081
function throttle(func: Function, delay: number) {
    let timer_flag: number | null = null;

    return (...args: any) => {
        if (timer_flag === null) {
            func(...args);
            timer_flag = setTimeout(() => {
                timer_flag = null;
            }, delay);
        }
    };
}



function set_svg(board: Board): void {
    const svg = board.svg;
    const pool = board.pool;
    let el_dragged = null as (ElRect | null);
    let is_dragging = false;
    let offsetX: number;
    let offsetY: number;

    svg.addEventListener('mouseover', (e) => {
        const target = e.target as SVGElement;
        if (is_dragging || target === null || !target.matches('.draggable')) {
            return;
        }
        target.setAttribute('fill', 'red');
    });

    svg.addEventListener('mouseout', (e) => {
        const target = e.target as SVGElement;
        if (target === null || !target.matches('.draggable')) {
            return;
        }
        if (!is_dragging) {
            target.setAttribute('fill', 'gray');
        }
    });
    
    svg.addEventListener('mousedown', (e) => {
        const target = e.target as SVGElement;
        if (target === null || !target.matches('.draggable')) {
            return;
        }
        el_dragged = board.pool.get_from_svg(target) as ElRect;
        el_dragged.el.setAttribute('fill', 'red');
        is_dragging = true;
        offsetX = e.clientX - el_dragged.x;
        offsetY = e.clientY - el_dragged.y;
    });

    const handle_mouse_move_El = throttle((e: MouseEvent) => {
        if (is_dragging && el_dragged !== null) {
            const x = e.clientX - offsetX;
            const y = e.clientY - offsetY;
            el_dragged.move_to(x, y);
        }
    }, 16.67);

    const handle_mouse_move_line = throttle((e: MouseEvent) => {
        if (is_dragging && el_dragged !== null) {
            for (const [line_type, other_el_key, line_key] of el_dragged.childrens) {
                const line = board.pool.get(line_key) as ElLine;
                const other_el = board.pool.get(other_el_key) as ElRect;
                if (line_type === 's') {
                    line.move_to(el_dragged, other_el); 
                } else if (line_type === 'e') {
                    line.move_to(other_el, el_dragged);
                }
            }
        }
    }, 16.67);

    svg.addEventListener('mousemove', handle_mouse_move_El);
    svg.addEventListener('mousemove', handle_mouse_move_line);

    svg.addEventListener('mouseup', () => {
        is_dragging = false;
        el_dragged = null;
    });
}

function create_rect(board: Board): void {
    const rect = new ElRect(getRandomRange(0, 500), getRandomRange(0, 500), 100, 100);
    rect.el.setAttribute('rx', '15');
    rect.el.setAttribute('fill', 'gray');
    rect.el.classList.add('draggable');
    rect.el_key = board.pool.push(rect, board.svg);
}

function create_line(board: Board): void {
    const el0 = board.pool.get(0) as ElRect;
    const el1 = board.pool.get(1) as ElRect;
    const line = new ElLine(el0, el1);
    line.el_key = board.pool.push(line, board.svg);
    el0.childrens.push(['s', el1.el_key, line.el_key]);
    el1.childrens.push(['e', el0.el_key, line.el_key]);
}

(() => {
    const svg = document.getElementById('pg');
    if (svg === null) throw new Error('No canvas with id `playground` is found');
    var pool = new Pool();
    const board: Board = {
        svg,
        pool
    };
    set_svg(board);
    window.addEventListener('keyup', (e) => {
        switch (e.code) {
            case 'KeyC':
                create_rect(board);
                break;
            case 'KeyL':
                if (board.pool.el_key >= 2) create_line(board);
                break;
            case 'KeyD':
                board.pool.remove(0, svg);
                break;
            default:
        }
    });

})();

