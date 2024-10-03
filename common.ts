export type Events = [string, any][];
export enum Mode {
    INITIAL_MODE,
    NORMAL_MODE,
    INSERT_MODE,
    UNDEFINIED = -1,
}
export enum TypeObj {
    BOND_OBJ,
    RECT_OBJ,
}

export interface Obj {
    x: number,
    y: number,
    el_key: ElKey,
    class_name: string,
    childrens: Map<ElKey, [LineType, ElKey | null]>,
    smallest_way_from_points: Function,
    smallest_way_from_el: Function,
    el: SVGRectElement,
}

interface Bond {
    el_key: ElKey,
    el: SVGLineElement,
}

export type El = Obj | Bond;
export type ModeStrings = keyof typeof Mode;
export type ObjStrings = keyof typeof TypeObj;
export type ElKey = number;
export type LineType = 's' | 'e';
export type SVGTypes = SVGRectElement;
export type TreeApp = {
    tree_grid: SVGElement,
    elements: SVGGElement,
    pool: Pool,
    current_mode: ModeStrings,
    events: Events,
}
export type ElPool = Map<ElKey, El>;

type Vector4 = [number, number, number, number]; 
type StartPoints = [Vector2, Vector2, Vector2, Vector2];

export class ElLine implements Bond {
    public el_key: ElKey = -1;
    public el: SVGLineElement
    constructor(el0: Obj, el1: Obj | Vector2) {
        this.el = (document.createElementNS('http://www.w3.org/2000/svg', 'line'));
        this.move_to(el0, el1);
        this.el.setAttribute('stroke', 'white');
        this.el.setAttribute('stroke-width', '4');
        this.el.setAttribute('marker-start', 'url(#dot)');
        this.el.setAttribute('marker-end', 'url(#triangle)');

    }
    public move_to(el0: Obj, el1: Obj | Vector2): void {
        switch (el1.class_name) {
            case 'ElRect':
                var [x1, y1, x2, y2] = el0.smallest_way_from_el(el1)
                break;
            case 'Vector2':
                var [x1, y1, x2, y2] = el0.smallest_way_from_points(el1)
                break;
            default:
                throw new Error(`Class nome not identified ${el1.class_name}`);
        }
        this.el.setAttribute('x1', x1.toString());
        this.el.setAttribute('y1', y1.toString());
        this.el.setAttribute('x2', x2.toString());
        this.el.setAttribute('y2', y2.toString());
    }
}


export class ElRect implements Obj {
    class_name: string;
    el: SVGRectElement;
    el_key: ElKey = -1;
    childrens: Map<ElKey, [LineType, ElKey | null]>;
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

        this.left_point   = new Vector2(0, 0);
        this.right_point  = new Vector2(0, 0);
        this.top_point    = new Vector2(0, 0);
        this.bottom_point = new Vector2(0, 0);
        this.start_points = this.get_start_points();

        this.childrens = new Map();
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
    public smallest_way_from_el(other: ElRect): Vector4 {
        var min = Infinity;
        var smallest_v: Vector4 | null = null;
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
    public smallest_way_from_points(other: Vector2): Vector4 {
        var min = Infinity;
        var smallest_v: Vector4 | null = null;
        for (const v0 of this.start_points) {
            const len = v0.len(other);
            if (len < min) {
                min = len;
                smallest_v = [v0.x, v0.y, other.x, other.y];
            }
        }
        if (smallest_v === null) throw new Error('Is not possible to established the best way');
        return smallest_v;
    }
}

export class Vector2 {
    class_name: string;
    x: number;
    y: number;
    constructor(x: number, y: number) {
        this.class_name = 'Vector2';
        this.x = x;
        this.y = y;
    }
    public len(other: Vector2): number {
        return Math.sqrt((this.x - other.x)**2 + (this.y - other.y)**2);
    }
    public scale(scalar: number): Vector2 {
        return new Vector2(this.x*scalar, this.y*scalar);
    }
    public sub(other: Vector2): Vector2 {
        return new Vector2(this.x-other.x, this.y-other.y);
    }
    public add(other: Vector2): Vector2 {
        return new Vector2(this.x+other.x, this.y+other.y);
    }
    public div(scalar: number): Vector2 {
        return new Vector2(this.x/scalar, this.y/scalar);
    }
}


export class Pool {
    el_key: ElKey;
    pool: ElPool;
    constructor() {
        this.el_key = 0;
        this.pool = new Map();
    }
    public push(el: Obj | Bond, elements: SVGGElement): number {
        this.pool.set(this.el_key, el);
        el.el.setAttribute('el_key', this.el_key.toString());
        this.el_key += 1;
        elements.appendChild(el.el);
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
    public remove(el_key: ElKey, elements: SVGGElement): void {
        elements.removeChild(this.get(el_key).el);
        this.pool.delete(el_key);
    }
}

// https://dev.to/jeetvora331/throttling-in-javascript-easiest-explanation-1081
export function throttle(func: Function, delay: number) {
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

export function getRandomRange(min: number, max: number): number {
    return Math.random() * (max - min) + min;
}
