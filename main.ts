// https://developer.mozilla.org/en-US/docs/Web/API/SVG_API
const MAX_GRID_X  = 100;
const MAX_GRID_Y  = 100;
const GRID_SIZE   = 20;
const BOARD_SIZE_X  = MAX_GRID_X*GRID_SIZE*5;
const BOARD_SIZE_Y  = MAX_GRID_Y*GRID_SIZE*5;
//https://www.color-hex.com/color-palette/104059
const OBJ_COLOR = '#f2f2e2';
const OBJ_COLOR_ACTIVE = '#ffffee'
const OBJ_COLOR_MOVE = '#fffff010'
const BOND_COLOR = 'black';
const BOND_COLOR_ACTIVE = '#575757';
const PAN_SPEED = 5;
const SCALE_FACTOR = 1.5;
const D_SCALE_FACTOR = 0.8
const STD_TEXT = 'Insira o texto aqui';

type Events = [string, any][];

enum Mode {
    INITIAL_MODE,
    NORMAL_MODE,
    INSERT_MODE,
    UNDEFINIED = -1,
}
enum TypeEl {
    OBJ,
    TEXT,
    BOND,
    UNDEFINIED = -1,
}
enum TypeTmp {
    OBJ,
    TEXT,
    LINE,
}

type El = ElObj | ElBond;
type ModeStrings = keyof typeof Mode;
type TypeElStrings = keyof typeof TypeEl;
type ElKey = number;
type LineType = 's' | 'e';
type Tmp = [TypeTmp, ElKey][];

type Limits = {
    readonly max_zoom_in: number,
    readonly max_zoom_out: number,
}

type ZoomPanNames = 'zoom_level' | 'pan_x' | 'pan_y';
type ZoomPanHolder = Record<ZoomPanNames, number>;

type CurrentState = {
    active_obj: ElKey | null,
    zoom_pan_state: ZoomPanHolder,
}

type SVGGroups = {
    tree_grid: SVGSVGElement,
    elements: SVGGElement,
    tmps: SVGGElement,
}

type TreeApp = {
    svg_groups: SVGGroups,
    pool: Pool,
    current_mode: ModeStrings,
    current_type_el: TypeElStrings | undefined;
    current_state: CurrentState,
    events: Events,
    tmps: Tmp,
    limits: Limits,
}
type ElPool = Map<ElKey, El>;

type Vector4 = [number, number, number, number]; 
type StartPoints = [Vector2, Vector2, Vector2, Vector2];

class Vector2 {
    x: number;
    y: number;
    matrix: DOMMatrix;
    constructor(x: number, y: number) {
        this.matrix = new DOMMatrix([x, 0, 0, y, 0, 0]);
        this.x = x;
        this.y = y;
    }
    static zero(): Vector2 {
        return new Vector2(0, 0);
    }
    static from_mouse(e: MouseEvent): Vector2 {
        return new Vector2(e.clientX, e.clientY);
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
    public round(): Vector2 {
        return new Vector2(Math.round(this.x), Math.round(this.y));
    }
    public multiply(other_matrix: DOMMatrix): Vector2 {
        const tmp_matrix = this.matrix.multiply(other_matrix);
        return new Vector2(tmp_matrix.a, tmp_matrix.d);
    }
    public set_xy(x: number, y: number): void {
        this.matrix.a = x;
        this.matrix.d = y;
        this.x = x;
        this.y = y;
    }
    public set_from_vector(v: Vector2): void {
        this.set_xy(v.x, v.y);
    }
    public normalize(v: Vector2): Vector2 {
        return this.sub(v).div(this.len(v));
    }
}

const OBJ_DIM = new Vector2(15*GRID_SIZE, 6*GRID_SIZE);

class ElBond {
    el_key: ElKey;
    el: SVGGElement;
    line: SVGLineElement;
    line_mouse_over: SVGLineElement;
    x1: number;
    x2: number;
    y1: number;
    y2: number;
    from: ElKey;
    to: ElKey | null;
    constructor(el0: ElObj, el1: ElObj | Vector2, tree_app: TreeApp) {
        this.el = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        this.line_mouse_over = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        this.line_mouse_over.setAttribute('stroke', 'rgba(0, 0, 0, 0)');
        this.line_mouse_over.setAttribute('stroke-width', '30');
        this.line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        [this.x1, this.y1, this.x2, this.y2] = [0, 0, 0, 0];
        this.move_to(el0, el1);

        this.el.setAttribute('stroke', BOND_COLOR);

        this.line.setAttribute('stroke-width', '7');
        this.line.setAttribute('marker-start', 'url(#dot)');
        this.line.setAttribute('marker-end', 'url(#triangle)');

        this.el.classList.add('draggable');
        this.el.classList.add('bond');
        this.el_key = tree_app.pool.push(this, tree_app.svg_groups.elements);
        this.el.appendChild(this.line);
        this.el.appendChild(this.line_mouse_over);

        this.from = el0.el_key;
        if (el1 instanceof ElObj) this.to = el1.el_key;
        else this.to = null;
    }
    public move_to(el0: ElObj, el1: ElObj | Vector2): void {
        if (el1 instanceof ElObj) {
            [this.x1, this.y1, this.x2, this.y2] = el0.smallest_way_from_el(el1);
        } else if (el1 instanceof Vector2) {
            [this.x1, this.y1, this.x2, this.y2] = el0.smallest_way_from_points(el1);
        } else {
                throw new Error(`Improper class ${typeof el1}`);
        }
        this.line.setAttribute('x1', this.x1.toString());
        this.line.setAttribute('y1', this.y1.toString());
        this.line.setAttribute('x2', this.x2.toString());
        this.line.setAttribute('y2', this.y2.toString());
        this.line_mouse_over.setAttribute('x1', this.x1.toString());
        this.line_mouse_over.setAttribute('y1', this.y1.toString());
        this.line_mouse_over.setAttribute('x2', this.x2.toString());
        this.line_mouse_over.setAttribute('y2', this.y2.toString());
    }
    public move_to_insert_mode(el0: ElObj, el1: Vector2, length: number, orient: Orient): void {
        const [x1, y1, x2, y2] = el0.smallest_way_from_points(el1);
        let v1 = new Vector2(x1, y1);
        let v2 = new Vector2(x2, y2);
        const distance = v2.normalize(v1);
        const v3 = v2.sub(distance.scale(length));
        if (orient === 's') {
            [this.x1, this.y1, this.x2, this.y2] = [x1, y1, v3.x, v3.y];
        }
        else if (orient === 'e') {
            [this.x2, this.y2, this.x1, this.y1] = [x1, y1, v3.x, v3.y];
        }
        this.line.setAttribute('x1', this.x1.toString());
        this.line.setAttribute('y1', this.y1.toString());
        this.line.setAttribute('x2', this.x2.toString());
        this.line.setAttribute('y2', this.y2.toString());
        this.line_mouse_over.setAttribute('x1', this.x1.toString());
        this.line_mouse_over.setAttribute('y1', this.y1.toString());
        this.line_mouse_over.setAttribute('x2', this.x2.toString());
        this.line_mouse_over.setAttribute('y2', this.y2.toString());
    }
}

class ElObj {
    el: SVGGElement;
    el_rect: SVGRectElement;
    el_text_wrapper: SVGForeignObjectElement;
    el_text: HTMLDivElement;
    has_text: boolean;
    el_key: ElKey = -1;
    childrens: Map<ElKey, [LineType, ElKey | null]>;
    public coords: Vector2; 
    public size: Vector2;
    private start_points: StartPoints;
    constructor(coords: Vector2, size: Vector2, tree_app: TreeApp) {
        let group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        let rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        let foreignObj = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
        let text = document.createElement('div');
        this.el = group;
        this.el_rect = rect;
        this.el_text_wrapper = foreignObj;
        this.el_text = text;
        this.el.appendChild(this.el_rect);
        this.el_text_wrapper.appendChild(this.el_text);
        this.el.appendChild(this.el_text_wrapper);
        this.el_key = tree_app.pool.push(this, tree_app.svg_groups.elements);

        this.el_rect.setAttribute('x', '0');
        this.el_rect.setAttribute('y', '0');

        this.el_text_wrapper.setAttribute('x', '0');
        this.el_text_wrapper.setAttribute('y', '0');
        this.el_text_wrapper.setAttribute('width', (size.x).toString());
        this.el_text_wrapper.setAttribute('height', (size.y).toString());

        // https://developer.mozilla.org/en-US/docs/Web/API/Element/innerHTML
        this.el_text.style.wordWrap = 'break-word';
        this.el_text.style.wordBreak = 'break-word';
        this.el_text.style.width = `${(size.x-20)}px`;
        this.el_text.style.height = `${(size.y-20)}px`;
        this.el_text.style.position = 'relative';
        this.el_text.style.top = '8px';
        this.el_text.style.left = '8px';
        this.el_text.style.color = 'gray';
        this.el_text.style.display = 'grid';
        this.el_text.style.alignItems = 'center';
        this.el_text.style.textAlign = 'center';
        this.el_text.style.userSelect = 'none'

        this.el_text.textContent = STD_TEXT;
        this.has_text = false;

        this.size = size;
        this.el_rect.setAttribute('width', this.size.x.toString());
        this.el_rect.setAttribute('height', this.size.y.toString());
        
        this.el.setAttribute('fill', 'rgba(255, 255, 255, 0.3');
        this.el.setAttribute('stroke', 'black');
        this.el.classList.add('draggable');
        this.el.classList.add('obj');

        this.coords = coords;
        this.el.style.transform = `translate(${coords.x}px, ${coords.y}px)`;

        this.start_points = this.get_start_points();

        this.childrens = new Map();
    }
    private get_start_points(): StartPoints {
        const left_point   = Vector2.zero();
        const right_point  = Vector2.zero();
        const top_point    = Vector2.zero();
        const bottom_point = Vector2.zero();

        left_point.x   = this.coords.x;
        left_point.y   = this.coords.y + this.size.y/2;

        right_point.x  = this.coords.x + this.size.x; 
        right_point.y  = this.coords.y + this.size.y/2;

        top_point.x    = this.coords.x + this.size.x/2;
        top_point.y    = this.coords.y;

        bottom_point.x = this.coords.x + this.size.x/2;
        bottom_point.y = this.coords.y + this.size.y;

        return [left_point, right_point, top_point, bottom_point];
    }
    public move_to(coords: Vector2): void {
        this.el.style.transform = `translate(${coords.x}px, ${coords.y}px)`;
        this.coords = coords;
        this.start_points = this.get_start_points();
    }
    public smallest_way_from_el(other: ElObj): Vector4 {
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
    public is_outside(e_coords: Vector2): boolean {
        return  e_coords.x < this.coords.x
            ||  e_coords.x > this.coords.x + this.size.x 
            ||  e_coords.y < this.coords.y
            ||  e_coords.y > this.coords.y + this.size.y;
    }
}

class Pool {
    el_key: ElKey;
    pool: ElPool;
    constructor() {
        this.el_key = 0;
        this.pool = new Map();
    }
    public push(el: El, elements: SVGGElement): number {
        this.pool.set(this.el_key, el);
        if (this.el_key === null) throw new Error('The el_key is null');
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
    public get_from_svg(el_svg: SVGElement | HTMLElement): El {
        const el_key = Number(el_svg.getAttribute('el_key'));
        return this.get(el_key);
    }
    public remove(el_key: ElKey, elements: SVGGElement): void {
        const el = this.get(el_key);
        if (el instanceof ElBond) {
            (this.get(el.from) as ElObj).childrens.delete(el_key);
            if (el.to !== null) {
                (this.get(el.to) as ElObj).childrens.delete(el_key);
            }
        } else if (el instanceof ElObj) {
            for (const [line_key, [..._]] of el.childrens) {
                this.remove(line_key, elements);
            }
        }
        elements.removeChild(el.el);
        this.pool.delete(el_key);
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

function clean_events(tree_app: TreeApp): void {
    while (tree_app.events.length > 0) {
        const [type, fun] = <[string, any]> tree_app.events.pop();
        tree_app.svg_groups.tree_grid.removeEventListener(type, fun);
    }
}

function clean_tmps(tree_app: TreeApp): void {
    while (tree_app.tmps.length) {
        const [type, el_key] = <[TypeTmp, ElKey]> tree_app.tmps.pop();
        switch (type) {
            case TypeTmp.OBJ:
            case TypeTmp.LINE:
                tree_app.pool.remove(el_key, tree_app.svg_groups.elements);
                break
            case TypeTmp.TEXT:
                const obj = tree_app.pool.get(el_key) as ElObj;
                if (obj.el_text.textContent !== null && obj.el_text.textContent.trim()) {
                    obj.el_text.textContent = obj.el_text.textContent.trim();
                    obj.el_text.style.color = 'black';
                    obj.has_text = true;
                } else {
                    obj.el_text.textContent = STD_TEXT;
                    obj.el_text.style.color = 'gray';
                    obj.has_text = false;
                }
                obj.el.setAttribute('fill', OBJ_COLOR);
                obj.el_text.style.border = '';
                obj.el_text.contentEditable = 'false';
                break
        }
    }
    if (tree_app.current_state.active_obj !== null) {
        const obj = tree_app.pool.get(tree_app.current_state.active_obj);
        obj.el.removeChild(obj.el.getElementsByClassName('delete')[0]);
        tree_app.current_state.active_obj = null;
    }
}

function cleaner(tree_app: TreeApp): void {
    clean_tmps(tree_app);
    clean_events(tree_app);
}

function search_el(tree_app: TreeApp, target: HTMLElement | null, target_class: string): El | null {
    let obj_tmp: ElObj | null = null;
    for (let i = 0; i < 3 && target !== null && target !== undefined; ++i) {
        if (target.matches(`.${target_class}`)) {
            obj_tmp = tree_app.pool.get_from_svg(target) as ElObj;
            break;
        }
        target = target.parentElement;
    }
    return obj_tmp;
}

function create_delete_icon(tree_app: TreeApp, obj: El): SVGSVGElement {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    svg.setAttribute('viewBox', '0 0 24 24');

    const w = 30;
    const h = 30;
    if (obj instanceof ElObj) {
        svg.setAttribute('x', '0');
        svg.setAttribute('y', '-40');
    } else if (obj instanceof ElBond) {
        const line = obj;
        if (line.y2 - line.y1 === 0) {
            svg.setAttribute('x', ((obj.x1+obj.x2)/2-w/2).toString());
            svg.setAttribute('y', ((obj.y1+obj.y2)/2-h*1.5).toString());
        } else if (line.x2 - line.x1 === 0) {
            svg.setAttribute('x', ((obj.x1+obj.x2)/2+w*.5).toString());
            svg.setAttribute('y', ((obj.y1+obj.y2)/2-h/2).toString());
        } else {
            const x = (line.x2 + line.x1)/2;
            const y = (line.y2 + line.y1)/2;
            const slope = (line.y2-line.y1)/(line.x2-line.x1);
            const intercept = line.y1-slope*line.x1;
            const slope_perpendicular = -1/slope;
            const intercept_perpendicular = y - slope_perpendicular * x;
            let v1 = new Vector2(x, y);
            let v2 = new Vector2(x-1, (slope_perpendicular*(x-1)+intercept_perpendicular));
            const distance = v2.normalize(v1);
            const v3 = v2.add(distance.scale(50));
            svg.setAttribute('x', v3.x.toString());
            svg.setAttribute('y', v3.y.toString());
        }

    }
    svg.setAttribute('width', w.toString());
    svg.setAttribute('height', h.toString());
    svg.classList.add('delete');
    path.setAttribute('d', 'M18.87 6h1.007l-.988 16.015A1.051 1.051 0 0 1 17.84 23H6.158a1.052 1.052 0 0 1-1.048-.984v-.001L4.123 6h1.003l.982 15.953a.05.05 0 0 0 .05.047h11.683zM9.5 19a.5.5 0 0 0 .5-.5v-10a.5.5 0 0 0-1 0v10a.5.5 0 0 0 .5.5zm5 0a.5.5 0 0 0 .5-.5v-10a.5.5 0 0 0-1 0v10a.5.5 0 0 0 .5.5zM5.064 5H3V4h5v-.75A1.251 1.251 0 0 1 9.25 2h5.5A1.251 1.251 0 0 1 16 3.25V4h5v1H5.064zM9 4h6v-.75a.25.25 0 0 0-.25-.25h-5.5a.25.25 0 0 0-.25.25z');
    rect.setAttribute('x', '0');
    rect.setAttribute('y', '0');
    rect.setAttribute('width', '100%');
    rect.setAttribute('height', '100%');
    rect.style.stroke = 'none';
    rect.style.fill = 'rgba(0, 0, 0, 0)';
    svg.appendChild(path);
    svg.appendChild(rect);
    svg.addEventListener('click', (e: MouseEvent) => {
        if (e.button === 0) {
            tree_app.pool.remove(obj.el_key, tree_app.svg_groups.elements);
            tree_app.current_state.active_obj = null;
        }
    });
    obj.el.appendChild(svg);
    return svg;
}

let modes: [HTMLElement, ModeStrings, TypeElStrings][];
let normal_mode

let normal_mode_el: HTMLElement | null;
let insert_obj_el:  HTMLElement | null; 
let insert_bond_el: HTMLElement | null;
let insert_text_el: HTMLElement | null;

const wrapper_handler_window_keyup_switch_modes = (e: KeyboardEvent) => {
    handler_window_keyup_switch_modes(e, tree_app);
};
const handler_window_keyup_switch_modes = (e: KeyboardEvent, tree_app: TreeApp) => {
    switch (e.key) {
        case 'n':
            switch_mode(tree_app, e, "NORMAL_MODE");
            for (const [e, ..._] of modes) e.classList.remove('active');
            if (normal_mode_el !== null) normal_mode_el.classList.add('active');
            break;
        case 'c':
            switch_mode(tree_app, e, "INSERT_MODE", "OBJ");
            for (const [e, ..._] of modes) e.classList.remove('active');
            if (insert_obj_el !== null) insert_obj_el.classList.add('active');
            break;
        case 'v':
            switch_mode(tree_app, e, "INSERT_MODE", "BOND");
            for (const [e, ..._] of modes) e.classList.remove('active');
            if (insert_bond_el !== null) insert_bond_el.classList.add('active');
            break;
        case 't':
            switch_mode(tree_app, e, "INSERT_MODE", "TEXT");
            for (const [e, ..._] of modes) e.classList.remove('active');
            if (insert_text_el !== null) insert_text_el.classList.add('active');
            break;
        case 'd':
            if (tree_app.current_mode === 'NORMAL_MODE' && tree_app.current_state.active_obj !== null) {
                tree_app.pool.remove(tree_app.current_state.active_obj, tree_app.svg_groups.elements);
                tree_app.current_state.active_obj = null;
            }
            break;
    }
};

function reset_zoom_and_pan(tree_app: TreeApp): [number, number] {
    const screen_w  = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
    const screen_h = window.innerHeight|| document.documentElement.clientHeight|| document.body.clientHeight;
    const x = Math.floor((BOARD_SIZE_X - screen_w) / 2);
    const y = Math.floor((BOARD_SIZE_Y - screen_h) / 2);
    tree_app.svg_groups.tree_grid.setAttribute('viewBox', `${x} ${y} ${screen_w} ${screen_h}`);
    grid_center.set_xy(x, y);
    tree_app.svg_groups.tree_grid.setAttribute('width', screen_w.toString());
    tree_app.svg_groups.tree_grid.setAttribute('height', screen_h.toString());
    tree_app.current_state.zoom_pan_state.zoom_level = 0;
    tree_app.current_state.zoom_pan_state.pan_x = tree_app.svg_groups.tree_grid.viewBox.baseVal.x;
    tree_app.current_state.zoom_pan_state.pan_y = tree_app.svg_groups.tree_grid.viewBox.baseVal.y;
    return [screen_w, screen_h];
}

function zoom_in(tree_app: TreeApp): void {
    if (tree_app.current_state.zoom_pan_state.zoom_level < tree_app.limits.max_zoom_in) {
        tree_app.current_state.zoom_pan_state.zoom_level += SCALE_FACTOR;
        const w = tree_app.svg_groups.tree_grid.viewBox.baseVal.width;
        const h = tree_app.svg_groups.tree_grid.viewBox.baseVal.height;
        tree_app.svg_groups.tree_grid.viewBox.baseVal.width /= SCALE_FACTOR;
        tree_app.svg_groups.tree_grid.viewBox.baseVal.height /= SCALE_FACTOR;
        tree_app.current_state.zoom_pan_state.pan_x += w/(SCALE_FACTOR*4);
        tree_app.current_state.zoom_pan_state.pan_y += h/(SCALE_FACTOR*4);
    }
}

function zoom_out(tree_app: TreeApp): void {
    if (tree_app.current_state.zoom_pan_state.zoom_level > tree_app.limits.max_zoom_out) {
        tree_app.current_state.zoom_pan_state.zoom_level -=  SCALE_FACTOR;
        const w = tree_app.svg_groups.tree_grid.viewBox.baseVal.width;
        const h = tree_app.svg_groups.tree_grid.viewBox.baseVal.height;
        tree_app.svg_groups.tree_grid.viewBox.baseVal.width *= SCALE_FACTOR;
        tree_app.svg_groups.tree_grid.viewBox.baseVal.height *= SCALE_FACTOR;
        tree_app.current_state.zoom_pan_state.pan_x += w*(1-SCALE_FACTOR)/2;
        tree_app.current_state.zoom_pan_state.pan_y += h*(1-SCALE_FACTOR)/2;
    }
}

const wrapper_handler_window_wheel_zoom_and_pan = (e: WheelEvent) => {
    handler_window_wheel_zoom_and_pan(e, tree_app);
};
const handler_window_wheel_zoom_and_pan = (e: WheelEvent, tree_app: TreeApp) => {
    if (e.deltaY < 0) zoom_in(tree_app);
    else if (e.deltaY > 0) zoom_out(tree_app);
};

const wrapper_handler_window_keyup_zoom_and_pan = (e: KeyboardEvent) => {
    handler_window_keyup_zoom_and_pan(e, tree_app);
};
const handler_window_keyup_zoom_and_pan = (e: KeyboardEvent, tree_app: TreeApp) => {
    switch (e.code) {
        case 'Backslash':
            zoom_in(tree_app);
            break;
        case 'BracketRight':
            zoom_out(tree_app);
            break;
        case 'ArrowUp':
            tree_app.current_state.zoom_pan_state.pan_y -= GRID_SIZE*PAN_SPEED;
            break;
        case 'ArrowDown':
            tree_app.current_state.zoom_pan_state.pan_y += GRID_SIZE*PAN_SPEED;
            break;
        case 'ArrowRight':
            tree_app.current_state.zoom_pan_state.pan_x += GRID_SIZE*PAN_SPEED;
            break;
        case 'ArrowLeft':
            tree_app.current_state.zoom_pan_state.pan_x -= GRID_SIZE*PAN_SPEED;
            break;
        case 'KeyH':
            reset_zoom_and_pan(tree_app);
            break;
    }
};

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function register_event(tree_app: TreeApp, type: string, listener: (e: MouseEvent) => void): void {
    tree_app.svg_groups.tree_grid.addEventListener(type, listener as EventListener);
    tree_app.events.push([type, listener]);
}


function set_normal_mode(tree_app: TreeApp): void {
    let el_dragged: ElObj | SVGSVGElement | ElBond | null = null;
    let is_dragging: boolean = false;
    let pos: 's' | 'e' | null = null;
    const offset = Vector2.zero();
    const displacement = Vector2.zero();

    const handle_mouse_move = (e: MouseEvent) => {
        if (!is_dragging) return;
        if (el_dragged instanceof ElObj) {
            el_dragged.el.style.cursor = 'grabbing';
            el_dragged.move_to(get_coords(tree_app).sub(offset as Vector2).div(GRID_SIZE).round().scale(GRID_SIZE));
            for (const [line_key, [line_type, other_el_key]] of el_dragged.childrens) {
                const line = tree_app.pool.get(line_key) as ElBond;
                const other_el = tree_app.pool.get(other_el_key as ElKey) as ElObj;
                if (line_type === 's') {
                    line.move_to(el_dragged, other_el); 
                } else if (line_type === 'e') {
                    line.move_to(other_el, el_dragged);
                }
            }
        } else if (el_dragged instanceof SVGSVGElement) {
            tree_app.svg_groups.tree_grid.style.cursor = 'grabbing';
            displacement.set_from_vector(mouse_coords.sub(offset));
            offset.set_from_vector(mouse_coords);
            tree_app.current_state.zoom_pan_state.pan_x -= displacement.x;
            tree_app.current_state.zoom_pan_state.pan_y -= displacement.y;
        } else if (el_dragged instanceof ElBond && pos !== null) {
            const el_from = tree_app.pool.get(el_dragged.from) as ElObj;
            const el_to = tree_app.pool.get(el_dragged.to as ElKey) as ElObj;
            const reinsert_args = {
                starter_obj: pos === 's' ? el_from : el_to,
                initial_obj: pos === 'e' ? el_from : el_to,
                line: el_dragged,
                orient: pos,
            };
            el_from.childrens.delete(el_dragged.el_key);
            el_to.childrens.delete(el_dragged.el_key);
            switch_mode(tree_app, null, 'INSERT_MODE', 'BOND', reinsert_args);
        }
    };

    const handle_mouse_move_grid = (e: MouseEvent) => {
        if (!is_dragging) return;
    };

    const handle_mouse_over = (e: MouseEvent) => {
        const coords = get_coords(tree_app);
        const el = search_el(tree_app, e.target as HTMLElement, 'draggable');
        if (is_dragging || el === null) return;
        if (el instanceof ElObj) el.el.setAttribute('fill', OBJ_COLOR_ACTIVE);
        else if (el instanceof ElBond) {
            const triangle = document.getElementById('triangle')
            const dot = document.getElementById('dot')
            if (triangle === null || dot === null) throw new Error('Not possible to find id `#triangle` and `#dot`!');
            if (coords.len(new Vector2(el.x1, el.y1)) <= 100) {
                dot.style.fill = 'red';
            } else if (coords.len(new Vector2(el.x2, el.y2)) <= 100) {
                triangle.style.fill = 'red';
            } else {
                el.el.setAttribute('stroke', BOND_COLOR_ACTIVE);
                triangle.style.fill = BOND_COLOR_ACTIVE;
                dot.style.fill = BOND_COLOR_ACTIVE;
            }
        }
    };

    const handle_mouse_out = (e: MouseEvent) => {
        if (is_dragging) return
        const el = search_el(tree_app, e.target as HTMLElement, 'draggable');
        if (el === null) return;
        if (el instanceof ElObj) el.el.setAttribute('fill', OBJ_COLOR);
        else if (el instanceof ElBond) {
            el.el.setAttribute('stroke', BOND_COLOR);
            const triangle = document.getElementById('triangle')
            const dot = document.getElementById('dot')
            if (triangle === null || dot === null) throw new Error('Not possible to find id `#triangle` and `#dot`!');
            triangle.style.fill = BOND_COLOR;
            dot.style.fill = BOND_COLOR;
        }
    };

    const handle_mouse_down = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (e.button !== 0) return;
        if (target !== null && target.id === 'grid') {
            el_dragged = tree_app.svg_groups.tree_grid;
            is_dragging = true;
            offset.set_from_vector(mouse_coords);
        } else {
            const obj_tmp = search_el(tree_app, target, 'draggable');
            if (obj_tmp !== null) {
                if (obj_tmp instanceof ElObj) {
                    el_dragged = obj_tmp;
                    el_dragged.el.setAttribute('fill', OBJ_COLOR_MOVE);
                    is_dragging = true;
                    offset.set_from_vector(get_coords(tree_app).sub(el_dragged.coords));
                } else if (obj_tmp instanceof ElBond) {
                    const triangle = document.getElementById('triangle')
                    const dot = document.getElementById('dot')
                    if (triangle === null || dot === null) throw new Error('Not possible to find id `#triangle` and `#dot`!');
                    const coords = get_coords(tree_app);
                    if (coords.len(new Vector2(obj_tmp.x1, obj_tmp.y1)) <= 100) {
                        pos = 'e';
                    } else if (coords.len(new Vector2(obj_tmp.x2, obj_tmp.y2)) <= 100) {
                        pos = 's';
                    }
                    el_dragged = obj_tmp;
                    el_dragged.el.setAttribute('fill', OBJ_COLOR_MOVE);
                    is_dragging = true;
                }
                if (tree_app.current_state.active_obj !== obj_tmp.el_key) {
                    if (tree_app.current_state.active_obj !== null) {
                        const active_obj = tree_app.pool.get(tree_app.current_state.active_obj);
                        active_obj.el.removeChild(active_obj.el.getElementsByClassName('delete')[0]);
                    }
                    tree_app.current_state.active_obj = obj_tmp.el_key;
                    const svg = create_delete_icon(tree_app, obj_tmp);
                }
            }
        }
    };

    const handle_mouse_up = async (e: MouseEvent) => {
        if (el_dragged instanceof ElObj) {
            el_dragged.el.setAttribute('fill', OBJ_COLOR_ACTIVE);
            el_dragged.el.style.cursor = 'pointer';
        }
        const is_svg = el_dragged instanceof SVGSVGElement;
        el_dragged = null;
        offset.set_xy(0, 0);
        is_dragging = false;
        let d = new Vector2(displacement.x, displacement.y).scale(D_SCALE_FACTOR);
        displacement.set_xy(0, 0)
        if (is_svg) {
            tree_app.svg_groups.tree_grid.style.cursor = 'default';
            const epslon = 0.01;
            for (; Math.abs(d.x) > epslon || Math.abs(d.y) > epslon; d = d.scale(D_SCALE_FACTOR)) {
                tree_app.current_state.zoom_pan_state.pan_x -= d.x;
                tree_app.current_state.zoom_pan_state.pan_y -= d.y;
                await sleep(15);
            }
        }
    };

    tree_app.svg_groups.tree_grid.addEventListener('mouseover', handle_mouse_over);
    tree_app.svg_groups.tree_grid.addEventListener('mouseout',  handle_mouse_out);
    tree_app.svg_groups.tree_grid.addEventListener('mousedown', handle_mouse_down);
    tree_app.svg_groups.tree_grid.addEventListener('mousemove', handle_mouse_move);
    tree_app.svg_groups.tree_grid.addEventListener('mousemove', handle_mouse_move_grid);
    tree_app.svg_groups.tree_grid.addEventListener('mouseup',   handle_mouse_up);

    tree_app.events.push(['mouseover', handle_mouse_over]);
    tree_app.events.push(['mouseout',  handle_mouse_out]);
    tree_app.events.push(['mousedown', handle_mouse_down]);
    tree_app.events.push(['mousemove', handle_mouse_move]);
    tree_app.events.push(['mousemove', handle_mouse_move_grid]);
    tree_app.events.push(['mouseup',   handle_mouse_up]);
}

const mouse_coords = Vector2.zero(); 
const global_mouse_position = (e: MouseEvent) => {
    mouse_coords.set_xy(e.clientX, e.clientY);
};
window.addEventListener('mousemove', global_mouse_position);

function get_coords(tree_app: TreeApp): Vector2 {
    const ctm = tree_app.svg_groups.tree_grid.getScreenCTM();
    if (ctm === null) throw new Error('No possible to get screen CTM.');
    const padding = new Vector2(tree_app.current_state.zoom_pan_state.pan_x, tree_app.current_state.zoom_pan_state.pan_y);
    return mouse_coords.multiply(ctm.inverse()).add(padding);
}

type Orient = 's' | 'e';
type Reinsert = {
    starter_obj: ElObj,
    initial_obj: ElObj,
    line: ElBond,
    orient: Orient;
};

function set_insert_mode_bond(tree_app: TreeApp, reinsert_args?: Reinsert): void {
    let starter_obj: ElObj | null = null;
    let line: ElBond | null = null;
    let is_putting: boolean = false;
    let orient: Orient = 's';

    if (reinsert_args !== undefined) {
        starter_obj = reinsert_args.starter_obj; 
        line = reinsert_args.line;
        orient = reinsert_args.orient;
        is_putting = true;
    }

    const handle_mouse_over = (e: MouseEvent) => {
        const target: HTMLElement | null = e.target as HTMLElement;
        const obj = search_el(tree_app, target, 'obj');
        if (obj !== null && (starter_obj === null || starter_obj.el_key !== obj.el_key)) {
            obj.el.setAttribute('fill', OBJ_COLOR_ACTIVE);
        }
    };

    const handle_mouse_down = (e: MouseEvent) => {
        const target: HTMLElement | null = e.target as HTMLElement;
        const obj = search_el(tree_app, target, 'obj') as ElObj;
        if (e.button !== 0) return;
        if (obj === null) {
            if (is_putting) {
                is_putting = false;
                if (starter_obj !== null) {
                    starter_obj.el.setAttribute('fill', OBJ_COLOR);
                    starter_obj = null;
                }
                if (line !== null) {
                    tree_app.pool.remove(line.el_key, tree_app.svg_groups.elements);
                    tree_app.tmps.pop();
                    line = null;
                }
            }
            return;
        }
        if (!is_putting && starter_obj === null && line === null) {
            starter_obj = obj as ElObj;
            starter_obj.el.setAttribute('fill', OBJ_COLOR_ACTIVE);
            line = new ElBond(starter_obj, get_coords(tree_app), tree_app);
            tree_app.tmps.push([TypeTmp.LINE, line.el_key]);
            is_putting = true;
            return;
        }
        if (starter_obj !== null && line !== null) {
            let is_bonded: boolean = false;;
            for (const [_, other_obj_key] of starter_obj.childrens.values()) {
                is_bonded = obj.el_key === other_obj_key;
            }
            if (!is_bonded) {
                bond_line(obj, starter_obj, line);
                line.to = obj.el_key;
                starter_obj.el.setAttribute('fill', OBJ_COLOR);
                obj.el.setAttribute('fill', OBJ_COLOR);
                tree_app.tmps.pop();
                is_putting = false;
                starter_obj = null;
                line = null;
                if (reinsert_args !== undefined) {
                    switch_mode(tree_app, null, "NORMAL_MODE");
                }
            }
        }
    };

    const handle_mouse_move = throttle((e: MouseEvent) => {
        if (is_putting && starter_obj !== null && line !== null) {
            line.move_to_insert_mode(starter_obj, get_coords(tree_app), 30, orient);
        }
    }, 16.67);

    const handle_mouse_out = (e: MouseEvent) => {
        const target: HTMLElement | null = e.target as HTMLElement;
        const obj = search_el(tree_app, target, 'obj');
        if (obj !== null && (starter_obj === null || starter_obj.el_key !== obj.el_key)) {
            obj.el.setAttribute('fill', OBJ_COLOR);
        }
    };

    function bond_line(obj: ElObj, starter_obj: ElObj, line: ElBond): void {
        if (orient === 's') {
            line.move_to(starter_obj as ElObj, obj);
            starter_obj.childrens.set(line.el_key, ['s', obj.el_key]);
            obj.childrens.set(line.el_key, ['e', starter_obj.el_key]);
            line.to = obj.el_key;
        } else if (orient === 'e') {
            line.move_to(obj, starter_obj as ElObj);
            starter_obj.childrens.set(line.el_key, ['e', obj.el_key]);
            obj.childrens.set(line.el_key, ['s', starter_obj.el_key]);
            line.from = obj.el_key;
        }
    }

    const handle_mouse_up = (e: MouseEvent) => {
        if (reinsert_args !== undefined && starter_obj !== null && line !== null) {
            const target: HTMLElement | null = e.target as HTMLElement;
            const obj = search_el(tree_app, target, 'obj') as ElObj;
            if (obj === null || obj.el_key === starter_obj.el_key) {
                const obj = reinsert_args.initial_obj;
                bond_line(obj, starter_obj, line);
            } else {
                let is_bonded: boolean = false;;
                for (const [_, other_obj_key] of starter_obj.childrens.values()) {
                    is_bonded = obj.el_key === other_obj_key;
                }
                if (!is_bonded) {
                    bond_line(obj, starter_obj, line);
                    starter_obj.el.setAttribute('fill', OBJ_COLOR);
                    obj.el.setAttribute('fill', OBJ_COLOR);
                }
            }
            tree_app.tmps.pop();
            is_putting = false;
            starter_obj = null;
            line = null;
            switch_mode(tree_app, null, "NORMAL_MODE");
        }
    };

    register_event(tree_app, 'mouseover', handle_mouse_over);
    register_event(tree_app, 'mouseout',  handle_mouse_out);
    register_event(tree_app, 'mousemove', handle_mouse_move);
    register_event(tree_app, 'mousedown', handle_mouse_down);
    register_event(tree_app, 'mouseup', handle_mouse_up);
}

function set_insert_mode_obj(tree_app: TreeApp, e: KeyboardEvent | null) {
    let is_putting: boolean = false;
    let starter_obj: ElObj | null = null;
    let obj: ElObj | null = null;

    const handle_mouse_move = (e: MouseEvent) => {
        if (obj !== null) {
            obj.move_to(get_coords(tree_app).sub(obj.size.div(2)).div(GRID_SIZE).round().scale(GRID_SIZE));
            is_putting = true;
        }
    };

    const handle_mouse_over = (e: MouseEvent) => {
        if (obj === null) {
            const coords = get_coords(tree_app).sub(OBJ_DIM.div(2));
            obj = new ElObj(coords, OBJ_DIM, tree_app);
            tree_app.tmps.push([TypeTmp.OBJ, obj.el_key]);
            tree_app.svg_groups.tree_grid.removeEventListener('mouseover', handle_mouse_over);
            tree_app.svg_groups.tree_grid.addEventListener('mousemove', handle_mouse_move);
        }
    };

    const handle_mouse_click = (e: MouseEvent) => {
        if (obj === null || !is_putting || e.button !== 0) return;
        tree_app.svg_groups.tree_grid.removeEventListener('mousemove', handle_mouse_move);
        tree_app.svg_groups.tree_grid.addEventListener('mouseover',  handle_mouse_over);
        tree_app.tmps.pop();
        obj.el.setAttribute('fill', OBJ_COLOR);
        obj.el_text.setAttribute('fill', 'gray');
        obj = null;
        is_putting = false;
        starter_obj = null;
    };

    tree_app.svg_groups.tree_grid.addEventListener('mouseover',  handle_mouse_over);
    tree_app.svg_groups.tree_grid.addEventListener('click',  handle_mouse_click);
    tree_app.events.push(['mouseover', handle_mouse_over]);
    tree_app.events.push(['click', handle_mouse_click]);
    tree_app.events.push(['mousemove', handle_mouse_move]);

    if (e !== null && e.code === 'KeyC') {
        const coords = get_coords(tree_app).sub(OBJ_DIM.div(2)).div(GRID_SIZE).round().scale(GRID_SIZE)
        obj = new ElObj(coords, OBJ_DIM, tree_app);
        tree_app.tmps.push([TypeTmp.OBJ, obj.el_key]);
        // obj.move_to(coords);
        tree_app.svg_groups.tree_grid.removeEventListener('mouseover', handle_mouse_over);
        tree_app.svg_groups.tree_grid.addEventListener('mousemove', handle_mouse_move);
    }
}

function set_insert_mode_text(tree_app: TreeApp) {
    let is_inserting: boolean = false;
    let obj: ElObj | null = null;

    // document.getElementsByTagName('body')[0].style.cursor = 'text';

    const handle_mouse_over = (e: MouseEvent) => {
        const target: HTMLElement | null = e.target as HTMLElement;
        const obj_tmp: El | null = search_el(tree_app, target, 'obj');
        if (obj === null && obj_tmp !== null) {
            obj = obj_tmp as ElObj;
            obj.el.setAttribute('fill', OBJ_COLOR_ACTIVE);
            obj.el_text.style.border = '2px dashed cadetblue';
            obj.el_text.contentEditable = 'true';
            tree_app.tmps.push([TypeTmp.TEXT, obj.el_key]);
        } else if (!is_inserting && obj !== null && obj_tmp === null) {
            obj.el.setAttribute('fill', OBJ_COLOR);
            obj.el_text.style.border = '';
            obj.el_text.contentEditable = 'false';
            obj = null;
            tree_app.tmps.pop();
        } else if (is_inserting && obj !== null && obj_tmp !== null) {
            (obj_tmp as ElObj).el.setAttribute('fill', OBJ_COLOR_ACTIVE);
            (obj_tmp as ElObj).el_text.style.border = '2px dashed cadetblue';
            (obj_tmp as ElObj).el_text.contentEditable = 'true';
        }
    };

    const handle_mouse_down = (e: MouseEvent) => {
        if (obj === null || e.button !== 0) return;
        if (!is_inserting) {
            if (!obj.has_text) {
                obj.el_text.textContent = '';
            }
            obj.el_text.style.border = '';
            obj.el_text.style.padding = '2px';
            obj.el_text.style.userSelect = 'text'
            is_inserting = true;
            window.removeEventListener('keyup', wrapper_handler_window_keyup_switch_modes);
            window.removeEventListener('keyup', wrapper_handler_window_keyup_zoom_and_pan);
        } else if (obj.is_outside(get_coords(tree_app))) {
            if (obj.el_text.textContent !== null && obj.el_text.textContent.trim()) {
                obj.el_text.textContent = obj.el_text.textContent.trim();
                obj.el_text.style.color = 'black';
                obj.has_text = true;
            } else {
                obj.el_text.textContent = STD_TEXT;
                obj.el_text.style.color = 'gray';
                obj.has_text = false;
            }

            is_inserting = false;
            obj.el_text.style.userSelect = 'none'
            obj.el_text.contentEditable = 'false';
            obj.el_text.style.padding = '';
            obj = null;
            tree_app.tmps.pop();
            window.addEventListener('keyup', wrapper_handler_window_keyup_switch_modes);
            window.addEventListener('keyup', wrapper_handler_window_keyup_zoom_and_pan);

            const obj_tmp: El | null = search_el(tree_app, e.target as HTMLElement, 'obj');
            if (obj_tmp !== null) {
                obj = obj_tmp as ElObj;
                tree_app.tmps.push([TypeTmp.TEXT, obj_tmp.el_key]);
                if (!obj.has_text) {
                    obj.el_text.textContent = '';
                }
                obj.el_text.style.border = '';
                obj.el_text.style.padding = '2px';
                obj.el_text.style.userSelect = 'text'
                is_inserting = true;
                window.removeEventListener('keyup', wrapper_handler_window_keyup_switch_modes);
                window.removeEventListener('keyup', wrapper_handler_window_keyup_zoom_and_pan);
            }
        }
    };

    const handle_key_up = (e: KeyboardEvent) => {
        if (obj === null) return;
        if (e.code === 'Enter' || e.key === 'Escape') {
            if (obj.el_text.textContent !== null && obj.el_text.textContent.trim()) {
                obj.el_text.textContent = obj.el_text.textContent.trim();
                obj.el_text.style.color = 'black';
                obj.has_text = true;
            } else {
                obj.el_text.textContent = STD_TEXT;
                obj.el_text.style.color = 'gray';
                obj.has_text = false;
            }

            is_inserting = false;
            obj.el_text.contentEditable = 'false';
            obj.el_text.style.padding = '';
            obj = null;
            tree_app.tmps.pop();
            window.addEventListener('keyup', wrapper_handler_window_keyup_switch_modes);
            window.addEventListener('keyup', wrapper_handler_window_keyup_zoom_and_pan);
        } else {
            //TODO increase dim of Obj if text is large
            // console.log(obj.el_text.textContent.length);
        }
    }
    tree_app.svg_groups.tree_grid.addEventListener('keyup', handle_key_up);
    tree_app.svg_groups.tree_grid.addEventListener('mouseover',  handle_mouse_over);
    tree_app.svg_groups.tree_grid.addEventListener('mousedown',  handle_mouse_down);

    tree_app.events.push(['mouseover', handle_mouse_over]);
    tree_app.events.push(['mousedown', handle_mouse_down]);
    tree_app.events.push(['keyup', handle_key_up]);
}

function switch_mode(tree_app: TreeApp, e: KeyboardEvent | null, mode: ModeStrings, type_el?: TypeElStrings, optional_args?: Reinsert): void {
    if (Mode[mode] === Mode[tree_app.current_mode] && type_el === tree_app.current_type_el) {
        return;
    }
    console.log(`Switching to ${mode}.`);
    document.getElementsByTagName('body')[0].style.cursor = 'default';
    tree_app.current_mode = mode;
    tree_app.current_type_el = type_el;

    cleaner(tree_app);

    switch (Mode[mode]) {
        case Mode.INITIAL_MODE:
            set_initial_mode(tree_app);
            break;
        case Mode.NORMAL_MODE:
            set_normal_mode(tree_app);
            break;
        case Mode.INSERT_MODE:
            if (type_el === undefined) throw new Error('The type of element is undefined');
            console.log(`Inserting ${type_el}.`);
            switch (TypeEl[type_el]) {
                case TypeEl.BOND:
                    set_insert_mode_bond(tree_app, optional_args);
                    break;
                case TypeEl.OBJ:
                    set_insert_mode_obj(tree_app, e);
                    break;
                case TypeEl.TEXT:
                    set_insert_mode_text(tree_app);
                    break;
                case TypeEl.UNDEFINIED:
                    throw new Error('The type of element is undefined');
                    break;
                default:
                    throw new Error(`The type of element ${type_el} is not know!`);
            }
            break;
        default:
            throw new Error(`Current mode ${tree_app.current_mode} not implemented`);
            break;
    }
}

const grid_center = Vector2.zero();
function set_initial_mode(tree_app: TreeApp): void {
    const [screen_w, screen_h] = reset_zoom_and_pan(tree_app);

    const grid_pat = document.getElementById('grid-pat');
    if (grid_pat === null) throw new Error('HTML element with ID `grid-pat` not found!');
    grid_pat.setAttribute('width', (GRID_SIZE*2).toString());
    grid_pat.setAttribute('height', (GRID_SIZE*2).toString());

    grid_pat.insertAdjacentHTML('beforeend', `<rect x='0'  y='0'  width='${GRID_SIZE}' height='${GRID_SIZE}' fill="white"/>`)
    grid_pat.insertAdjacentHTML('beforeend', `<rect x='${GRID_SIZE}'  y='0'  width='${GRID_SIZE}' height='${GRID_SIZE}' fill="rgb(240, 240, 240)"/>`)
    grid_pat.insertAdjacentHTML('beforeend', `<rect x='${GRID_SIZE}'  y='${GRID_SIZE}'  width='${GRID_SIZE}' height='${GRID_SIZE}' fill="white"/>`)
    grid_pat.insertAdjacentHTML('beforeend', `<rect x='0'  y='${GRID_SIZE}'  width='${GRID_SIZE}' height='${GRID_SIZE}' fill="rgb(240, 240, 240)"/>`)

    const grid = document.getElementById('grid');
    if (grid === null) throw new Error('HTML element with ID `grid` is not found!');
    grid.setAttribute('width', (MAX_GRID_X*GRID_SIZE*5).toString());
    grid.setAttribute('height', (MAX_GRID_Y*GRID_SIZE*5).toString());
    grid.setAttribute('x', '0');
    grid.setAttribute('y', '0');

    const menu_grid = document.getElementById('menu-grid');
    if (menu_grid === null) throw new Error('HTML element with ID `menu-grid` is not found!');
    menu_grid.style.top = ((screen_h-Number(menu_grid.getAttribute('height')))/2).toString();

    window.addEventListener('resize', (event) => {{
        const [screen_w, screen_h] = reset_zoom_and_pan(tree_app);
        menu_grid.style.top = ((screen_h-Number(menu_grid.getAttribute('height')))/2).toString();
    }});

    normal_mode_el = document.getElementById('normal-mode')
    if (normal_mode_el === null) throw new Error('Id "normal-mode" not found');
    insert_obj_el = document.getElementById('insert-obj')
    if (insert_obj_el === null) throw new Error('ID `insert-obj` is not found!');
    insert_bond_el = document.getElementById('insert-bond')
    if (insert_bond_el === null) throw new Error('Id "insert-bond" not found');
    insert_text_el = document.getElementById('insert-text');
    if (insert_text_el === null) throw new Error('ID `insert-text` is not found!');
    
    modes = [
        [normal_mode_el, 'NORMAL_MODE', 'UNDEFINIED'],
        [insert_obj_el,  'INSERT_MODE', 'OBJ'],
        [insert_bond_el, 'INSERT_MODE', 'BOND'],
        [insert_text_el, 'INSERT_MODE', 'TEXT'],
    ];

    for (const [mode, mode_name, type_el] of modes) {
        mode.addEventListener('click', (e) => {
            switch_mode(tree_app, null, mode_name, type_el);
            for (const [e, ..._] of modes) e.classList.remove('active');
            mode.classList.add('active');
        });
    }

    const home_el = document.getElementById('home')
    if (home_el === null) throw new Error('Id `home` not found');
    const zoom_in_el = document.getElementById('zoom-in')
    if (zoom_in_el === null) throw new Error('ID `zoom-in` is not found!');
    const zoom_out_el = document.getElementById('zoom-out')
    if (zoom_out_el === null) throw new Error('Id `zoom-out` not found');

    home_el.addEventListener('click', (e) => {
        reset_zoom_and_pan(tree_app);
    });
    zoom_in_el.addEventListener('click', (e) => {
        zoom_in(tree_app);
    });
    zoom_out_el.addEventListener('click', (e) => {
        zoom_out(tree_app);
    });


    window.addEventListener('keyup', wrapper_handler_window_keyup_switch_modes);
    window.addEventListener('keyup', wrapper_handler_window_keyup_zoom_and_pan);
    window.addEventListener('wheel', wrapper_handler_window_wheel_zoom_and_pan);
}

function proxy_zoom_pan_constructor(zoom_pan_holder: ZoomPanHolder): ZoomPanHolder {
    return new Proxy( zoom_pan_holder, {
        set(target: ZoomPanHolder, property: ZoomPanNames, value: number): boolean {
            if (value === Infinity) return false;
            target[property] = value;
            if (property == 'pan_x') {
                tree_app.svg_groups.tree_grid.viewBox.baseVal.x = value;
            } else if (property == 'pan_y') {
                tree_app.svg_groups.tree_grid.viewBox.baseVal.y = value;
            } 
            const home_icon = document.getElementById('home');
            if (home_icon === null) throw new Error('Could not found id `home`in document!');
            if (property === 'zoom_level') {
                if (value) home_icon.style.display = 'inline';
                else home_icon.style.display = 'none';
            } else {
                if (target['pan_x'] !== grid_center.x || target['pan_y'] !== grid_center.y)  home_icon.style.display = 'inline';
                else home_icon.style.display = 'none';
            }
            return true;
        },
    });
}

let tree_app: TreeApp;
function main() {
    console.info("DOM loaded");
    const tree_grid = document.getElementById('tree_grid') as SVGSVGElement | null;
    if (tree_grid === null) throw new Error('No DOMElement with id `tree_grid` is found');
    const elements = document.getElementById('elements') as SVGGElement | null;
    if (elements === null) throw new Error('No DOMElement with id `elements` is found');
    const tmps = document.getElementById('tmps') as SVGGElement | null;
    if (tmps === null) throw new Error('No DOMElement with id `tmps` is found');

    const zoom_pan_holder: ZoomPanHolder = {
        zoom_level: 0,
        pan_x: Infinity,
        pan_y: Infinity,
    };
    let zoom_pan_state = proxy_zoom_pan_constructor(zoom_pan_holder);

    tree_app = {
        svg_groups: {
            tree_grid,
            elements,
            tmps,
        },
        pool: new Pool(),
        current_mode: "UNDEFINIED",
        current_type_el: "UNDEFINIED",
        current_state: {
            active_obj: null,
            zoom_pan_state: zoom_pan_state,
        },
        events: [],
        tmps: [],
        limits: {
            max_zoom_out: -6,
            max_zoom_in:   4.5,
        }
    };

    switch_mode(tree_app, null, "INITIAL_MODE");
    console.log(`Starting in ${tree_app.current_mode}`);
    switch_mode(tree_app, null, "NORMAL_MODE");
    if (normal_mode_el !== null) normal_mode_el.classList.add('active');
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", main);
} else {
    main();
}
//TODO 
//1) increase dim of Obj if text is large;
//3) Adicionar uma opção para inverter o vínculo
//2) Aprimorar o algoritmo que coloca o ícone de deletar vínculos;
//4)??? Adicionar um cursor customizado para cada uma das funções do menu
// https://blog.logrocket.com/creating-custom-mouse-cursor-css/
//7) Implementar um sistema de undo e redo
//10) ver se é possível corrigir o erro de o cursor do mouse aparecer embaixo quando clica para editar no modo texto
//12) movimentar o grid com o mouse é muito lento quando em excessivo zoom out 
//16)Adicionar um indicar de qual o zoom no momento e em qual posição (x=0, y=0, é o centro);
//17) não permitir que seja possível criar objeto e vínculo no além grid (no void);
//18) Adicionar um efeito de magneto quando inserir o elemento de vinculação ao se aproximar de um objeto.
//19) Adicionar a opção de deletar no teclado;
//20) Ferramenta para selecionar múltiplos objetos e vínculos;
