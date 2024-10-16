// https://developer.mozilla.org/en-US/docs/Web/API/SVG_API
const MAX_GRID_X  = 40;
const MAX_GRID_Y  = 30;
const GRID_SIZE   = 20;
const BOARD_SIZE_X  = MAX_GRID_X*GRID_SIZE*5;
const BOARD_SIZE_Y  = MAX_GRID_Y*GRID_SIZE*5;
//https://www.color-hex.com/color-palette/104059
const OBJ_COLOR = '#f2f2e2';
const OBJ_COLOR_ACTIVE = '#ffffee'
const OBJ_COLOR_MOVE = '#fffff0a0'
const SCALE_FACTOR = 1.5;
const STD_TEXT = 'Insira o texto aqui';

class Vector2 {
    x: number;
    y: number;
    matrix: DOMMatrixReadOnly;
    constructor(x: number, y: number) {
        this.matrix = new DOMMatrixReadOnly([x, 0, 0, y, 0, 0]);
        this.x = x;
        this.y = y;
    }
    static zero(): Vector2 {
        return new Vector2(0, 0);
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
}

const OBJ_DIM = new Vector2(15*GRID_SIZE, 6*GRID_SIZE);

class ElLine {
    el_key: ElKey;
    el: SVGLineElement;
    constructor(el0: ElObj, el1: ElObj | Vector2) {
        this.el_key = null;
        this.el = (document.createElementNS('http://www.w3.org/2000/svg', 'line'));
        this.move_to(el0, el1);
        this.el.setAttribute('stroke', 'black');
        this.el.setAttribute('stroke-width', '7');
        this.el.setAttribute('marker-start', 'url(#dot)');
        this.el.setAttribute('marker-end', 'url(#triangle)');
        this.el.classList.add('draggable');
    }
    public move_to(el0: ElObj, el1: ElObj | Vector2): void {
        if (el1 instanceof ElObj) {
            var [x1, y1, x2, y2] = el0.smallest_way_from_el(el1);
        } else if (el1 instanceof Vector2) {
            var [x1, y1, x2, y2] = el0.smallest_way_from_points(el1);
        } else {
                throw new Error(`Improper class ${typeof el1}`);
        }
        this.el.setAttribute('x1', x1.toString());
        this.el.setAttribute('y1', y1.toString());
        this.el.setAttribute('x2', x2.toString());
        this.el.setAttribute('y2', y2.toString());
    }
    public move_to_insert_mode(el0: ElObj, el1: Vector2, length: number): void {
        var [x1, y1, x2, y2] = el0.smallest_way_from_points(el1);
        let v1 = new Vector2(x1, y1);
        let v2 = new Vector2(x2, y2);
        let line_length = v2.len(v1);
        let d = v2.sub(v1).div(line_length);
        const v3 = v2.sub(d.scale(length));
        this.el.setAttribute('x1', x1.toString());
        this.el.setAttribute('y1', y1.toString());
        this.el.setAttribute('x2', v3.x.toString());
        this.el.setAttribute('y2', v3.y.toString());
    }
}

class ElObj {
    el: SVGGElement;
    el_rect: SVGRectElement;
    el_text: SVGTextElement;
    has_text: boolean;
    el_key: ElKey = -1;
    childrens: Map<ElKey, [LineType, ElKey | null]>;
    public coords: Vector2; 
    public w: number;
    public h: number;
    private start_points: StartPoints;
    private left_point: Vector2;
    private right_point: Vector2;
    private top_point: Vector2;
    private bottom_point: Vector2;
    constructor(x: number, y: number, w: number, h: number) {
        let group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        let rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        let text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        this.el = group;
        this.el_rect = rect;
        this.el_text = text;
        this.el.appendChild(this.el_rect);
        this.el.appendChild(this.el_text);

        this.el_rect.setAttribute('x', '0');
        this.el_rect.setAttribute('y', '0');

        // https://developer.mozilla.org/en-US/docs/Web/API/Element/innerHTML
        this.el_text.setAttribute('stroke', 'none');
        this.el_text.textContent = STD_TEXT;
        this.has_text = false;

        this.coords = new Vector2(x, y);
        this.w = w;
        this.el_rect.setAttribute('width', w.toString());
        this.h = h;
        this.el_rect.setAttribute('height', h.toString());
        
        this.el.setAttribute('fill', 'rgba(255, 255, 255, 0.3');
        this.el.setAttribute('stroke', 'black');
        this.el.classList.add('draggable');
        this.el.classList.add('obj');

        this.left_point   = Vector2.zero();
        this.right_point  = Vector2.zero();
        this.top_point    = Vector2.zero();
        this.bottom_point = Vector2.zero();
        this.start_points = [this.left_point, this.right_point, this.top_point, this.bottom_point];
        this.move_to(this.coords);

        this.childrens = new Map();
    }
    private get_start_points(): StartPoints {
        this.left_point.x = this.coords.x;
        this.left_point.y = this.coords.y + this.h/2;

        this.right_point.x  = this.coords.x + this.w; 
        this.right_point.y  = this.coords.y + this.h/2;

        this.top_point.x    = this.coords.x + this.w/2;
        this.top_point.y    = this.coords.y;

        this.bottom_point.x = this.coords.x + this.w/2;
        this.bottom_point.y = this.coords.y + this.h;

        return [this.left_point, this.right_point, this.top_point, this.bottom_point];
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
        // console.log(this.coords.x, e_coords.x, this.coords.y, e_coords.y);
        return  e_coords.x < this.coords.x
            ||  e_coords.x > this.coords.x + this.w 
            ||  e_coords.y < this.coords.y
            ||  e_coords.y > this.coords.y + this.h;
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
    public get_from_svg(el_svg: SVGElement | HTMLElement): ElObj | ElLine {
        const el_key = Number(el_svg.getAttribute('el_key'));
        return this.get(el_key);
    }
    public remove(el_key: ElKey, elements: SVGGElement): void {
        elements.removeChild(this.get(el_key).el);
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
        tree_app.tree_grid.removeEventListener(type, fun);
    }
}

function getRandomRange(min: number, max: number): number {
    return Math.random() * (max - min) + min;
}


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

type Obj = ElObj;
type Bond = ElLine;
type El = Obj | Bond;
type ModeStrings = keyof typeof Mode;
type TypeElStrings = keyof typeof TypeEl;
type ElKey = number | null;
type LineType = 's' | 'e';
type SVGTypes = SVGRectElement;
type TreeApp = {
    tree_grid: SVGSVGElement,
    elements: SVGGElement,
    pool: Pool,
    current_mode: ModeStrings,
    current_type_el: TypeElStrings | undefined;
    events: Events,
    tmp_element: ElKey | null,
}
type ElPool = Map<ElKey, El>;

type Vector4 = [number, number, number, number]; 
type StartPoints = [Vector2, Vector2, Vector2, Vector2];

function clean_tmps(tree_app: TreeApp): void {
    if (tree_app.tmp_element !== null) {
        tree_app.pool.remove(tree_app.tmp_element, tree_app.elements);
        tree_app.tmp_element = null;
    }
}

function cleaner(tree_app: TreeApp): void {
    clean_tmps(tree_app);
    clean_events(tree_app);
}

function set_normal_mode(tree_app: TreeApp): void {
    var el_dragged: ElObj | null = null;
    var is_dragging: boolean = false;
    var offset: Vector2 | undefined = undefined;

    cleaner(tree_app);

    const handle_mouse_move_El = throttle((e: MouseEvent) => {
        if (is_dragging && el_dragged !== null) {
            el_dragged.move_to(get_coords(tree_app, e).sub(offset as Vector2).div(GRID_SIZE).round().scale(GRID_SIZE));
        }
    }, 16.67);

    const handle_mouse_move_line = throttle((e: MouseEvent) => {
        if (is_dragging && el_dragged !== null) {
            for (const [line_key, [line_type, other_el_key]] of el_dragged.childrens) {
                const line = tree_app.pool.get(line_key) as ElLine;
                const other_el = tree_app.pool.get(other_el_key as ElKey) as ElObj;
                if (line_type === 's') {
                    line.move_to(el_dragged, other_el); 
                } else if (line_type === 'e') {
                    line.move_to(other_el, el_dragged);
                }
            }
        }
    }, 16.67);

    const handle_mouse_over = (e: MouseEvent) => {
        const target = e.target as SVGElement;
        if (is_dragging || target === null || target.parentElement === null || !target.parentElement.matches('.draggable')) return;

        target.parentElement.setAttribute('fill', OBJ_COLOR_ACTIVE);
    };

    const handle_mouse_out = (e: MouseEvent) => {
        const target = e.target as SVGElement;
        if (target === null || target.parentElement === null || !target.parentElement.matches('.draggable')) return;

        if (!is_dragging) {
            target.parentElement.setAttribute('fill', OBJ_COLOR);
        }
    };

    const handle_mouse_down = (e: MouseEvent) => {
        const target = e.target as SVGElement;
        if (target === null || target.parentElement === null || !target.parentElement.matches('.draggable')) return;

        el_dragged = tree_app.pool.get_from_svg(target.parentElement) as ElObj;
        el_dragged.el.setAttribute('fill', OBJ_COLOR_MOVE);
        is_dragging = true;
        offset = get_coords(tree_app, e).sub(el_dragged.coords);
    };

    const handle_mouse_up = (e: MouseEvent) => {
        is_dragging = false;
        if (el_dragged !== null) el_dragged.el.setAttribute('fill', OBJ_COLOR_ACTIVE);
        el_dragged = null;
        offset = undefined;
    };

    tree_app.tree_grid.addEventListener('mouseover', handle_mouse_over);
    tree_app.tree_grid.addEventListener('mouseout',  handle_mouse_out);
    tree_app.tree_grid.addEventListener('mousedown', handle_mouse_down);
    tree_app.tree_grid.addEventListener('mousemove', handle_mouse_move_El);
    tree_app.tree_grid.addEventListener('mousemove', handle_mouse_move_line);
    tree_app.tree_grid.addEventListener('mouseup',   handle_mouse_up);

    tree_app.events.push(['mouseover', handle_mouse_over]);
    tree_app.events.push(['mouseout',  handle_mouse_out]);
    tree_app.events.push(['mousedown', handle_mouse_down]);
    tree_app.events.push(['mousemove', handle_mouse_move_El]);
    tree_app.events.push(['mousemove', handle_mouse_move_line]);
    tree_app.events.push(['mouseup',   handle_mouse_up]);
}


function centralize_text(el_text: SVGTextElement): void {
    const text_width = el_text.getBBox().width;
    const text_height = el_text.getBBox().height;
    el_text.setAttribute('x', ((OBJ_DIM.x-text_width)/2).toString());
    el_text.setAttribute('y', ((OBJ_DIM.y+text_height/2)/2).toString());
}

function create_obj(coords: Vector2, OBJ_DIM: Vector2, tree_app: TreeApp): ElObj {
    const obj = new ElObj(coords.x, coords.y, OBJ_DIM.x, OBJ_DIM.y);
    obj.el_key = tree_app.pool.push(obj, tree_app.elements);
    centralize_text(obj.el_text);

    return obj;
}

function create_line(tree_app: TreeApp, starter_obj: Obj, points: Vector2): ElLine {
    const line = new ElLine(starter_obj, points);
    line.el_key = tree_app.pool.push(line, tree_app.elements);
    return line;
}

function get_coords(tree_app: TreeApp, e: MouseEvent): Vector2 {
    const ctm = tree_app.tree_grid.getScreenCTM();
    if (ctm === null) throw new Error('No possible to get screen CTM.');
    let coords = new Vector2(e.clientX, e.clientY).multiply(ctm.inverse())
    const padding = new Vector2(tree_app.tree_grid.viewBox.baseVal.x, tree_app.tree_grid.viewBox.baseVal.y);
    return coords.add(padding);
}

function set_insert_mode_bond(tree_app: TreeApp): void {
    let starter_obj: ElObj | null = null;
    let line: ElLine | null = null;
    let is_putting: boolean = false;

    cleaner(tree_app);

    const handle_mouse_over = (e: MouseEvent) => {
        const target = e.target as SVGElement;
        if (target === null || target.parentElement === null || !target.parentElement.matches('.draggable')) return;

        if (starter_obj === null || starter_obj.el_key !== Number(target.parentElement.getAttribute('el_key'))) {
            target.parentElement.setAttribute('fill', OBJ_COLOR_ACTIVE);
        }
    };

    const handle_mouse_down = (e: MouseEvent, tree_app: TreeApp) => {
        const target = e.target as SVGElement;
        if (target === null || target.parentElement === null || !target.parentElement.matches('.draggable')) {
            if (is_putting) {
                is_putting = false;
                if (starter_obj !== null) {
                    starter_obj.el.setAttribute('fill', OBJ_COLOR);
                    starter_obj = null;
                }
                if (line !== null && line.el_key !== null) {
                    tree_app.pool.remove(line.el_key, tree_app.elements);
                    tree_app.tmp_element = null;
                    line = null;
                }
            }
            return;
        }
        const obj = tree_app.pool.get_from_svg(target.parentElement) as ElObj;
        if (is_putting && starter_obj !== null && line !== null) {
            line.move_to(starter_obj as ElObj, obj);
            starter_obj.el.setAttribute('fill', OBJ_COLOR);
            obj.el.setAttribute('fill', OBJ_COLOR);
            starter_obj.childrens.set(line.el_key, ['s', obj.el_key]);
            obj.childrens.set(line.el_key, ['e', starter_obj.el_key]);
            tree_app.tmp_element = null;
            is_putting = false;
            starter_obj = null;
            line = null;
        } else {
            starter_obj = obj;
            starter_obj.el.setAttribute('fill', OBJ_COLOR_ACTIVE);
            line = create_line(tree_app, starter_obj as ElObj, get_coords(tree_app, e));
            tree_app.tmp_element = line.el_key;
            is_putting = true;
        }
    };

    const handle_mouse_move = throttle((e: MouseEvent) => {
        if (is_putting && starter_obj !== null && line !== null) {
            let mouse_coords = get_coords(tree_app, e);
            line.move_to_insert_mode(starter_obj, mouse_coords, 50);
        }
    }, 16.67);

    const handle_mouse_out = (e: MouseEvent) => {
        const target = e.target as SVGElement;
        if (target === null || target.parentElement === null || !target.parentElement.matches('.draggable')) return;

        if (starter_obj === null || starter_obj.el_key !== Number(target.parentElement.getAttribute('el_key'))) {
            target.parentElement.setAttribute('fill', OBJ_COLOR);
        }
    };

    const wrapper_mouse_down = (e: MouseEvent) => {
        return handle_mouse_down(e, tree_app);
    }

    tree_app.tree_grid.addEventListener('mouseover', handle_mouse_over);
    tree_app.tree_grid.addEventListener('mouseout',  handle_mouse_out);
    tree_app.tree_grid.addEventListener('mousemove', handle_mouse_move);
    tree_app.tree_grid.addEventListener('mousedown', wrapper_mouse_down);

    tree_app.events.push(['mouseover', handle_mouse_over]);
    tree_app.events.push(['mouseout',  handle_mouse_out]);
    tree_app.events.push(['mousemove', handle_mouse_move]);
    tree_app.events.push(['mousedown', wrapper_mouse_down]);
}

function set_insert_mode_obj(tree_app: TreeApp) {
    let is_putting: boolean = false;
    let starter_obj: ElObj | null = null;
    let obj: ElObj | null = null;

    cleaner(tree_app);

    const handle_mouse_move = (e: MouseEvent) => {
        if (obj === null) return;
        obj.move_to(get_coords(tree_app, e).sub(OBJ_DIM.div(2)).div(GRID_SIZE).round().scale(GRID_SIZE));
        is_putting = true;
    };

    const handle_mouse_over = (e: MouseEvent) => {
        if (obj === null) {
            const coords = get_coords(tree_app, e).sub(OBJ_DIM.div(2));
            obj = create_obj(coords, OBJ_DIM, tree_app);
            tree_app.tmp_element = obj.el_key;
            tree_app.tree_grid.removeEventListener('mouseover', handle_mouse_over);
            tree_app.tree_grid.addEventListener('mousemove', handle_mouse_move);
        }
    };

    const handle_mouse_click = (e: MouseEvent) => {
        if (obj === null || !is_putting) return;
        tree_app.tree_grid.removeEventListener('mousemove', handle_mouse_move);
        tree_app.tree_grid.addEventListener('mouseover',  handle_mouse_over);
        tree_app.tmp_element = null;
        obj.el.setAttribute('fill', OBJ_COLOR);
        obj.el_text.setAttribute('fill', 'gray');
        obj = null;
        is_putting = false;
        starter_obj = null;
    };

    tree_app.tree_grid.addEventListener('mouseover',  handle_mouse_over);
    tree_app.tree_grid.addEventListener('click',  handle_mouse_click);
    tree_app.events.push(['mouseover', handle_mouse_over]);
    tree_app.events.push(['click', handle_mouse_click]);
    tree_app.events.push(['mousemove', handle_mouse_move]);
}

function set_insert_mode_text(tree_app: TreeApp) {
    let is_inserting: boolean = false;
    let foreignObj: SVGForeignObjectElement | null = null;
    let inputObj: HTMLDivElement | null = null;
    let obj: ElObj | null = null;
    cleaner(tree_app);

    document.getElementsByTagName('body')[0].style.cursor = 'text';

    const handle_mouse_over = (e: MouseEvent) => {
        const target = e.target as SVGElement;
        if (obj === null && target !== null && target.parentElement !== null) {
            target.parentElement.setAttribute('fill', OBJ_COLOR_ACTIVE);
            if (target.parentElement.matches('.obj') && inputObj === null) {
                foreignObj = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject') as SVGForeignObjectElement;
                foreignObj.setAttribute('x', '0');
                foreignObj.setAttribute('y', '0');
                foreignObj.setAttribute('width', (OBJ_DIM.x).toString());
                foreignObj.setAttribute('height', (OBJ_DIM.y).toString());

                inputObj = document.createElement('div') as HTMLDivElement;
                inputObj.contentEditable = 'true';
                inputObj.style.wordWrap = 'break-word';
                inputObj.style.wordBreak = 'break-word';
                inputObj.style.width = `${(OBJ_DIM.x-20)}px`;
                inputObj.style.height = `${(OBJ_DIM.y-20)}px`;
                inputObj.style.position = 'relative';
                inputObj.style.top = '8px';
                inputObj.style.left = '8px';
                inputObj.style.border = '2px dashed cadetblue';

                foreignObj.appendChild(inputObj);
                obj = tree_app.pool.get_from_svg(target.parentElement) as ElObj;
                obj.el.appendChild(foreignObj);
            }
        }
        if (!is_inserting && obj !== null && obj.is_outside(get_coords(tree_app, e))) {
            obj.el.setAttribute('fill', OBJ_COLOR);
            obj.el.removeChild(foreignObj as Node);
            inputObj = null;
            foreignObj = null;
            obj = null;
        }
    };

    const handle_mouse_down = (e: MouseEvent) => {
        if (obj === null || inputObj === null) return;
        if (!is_inserting) {
            if (obj.has_text) {
                inputObj.textContent = obj.el_text.textContent;
            }
            obj.el_text.textContent = '';
            inputObj.style.border = '';
            inputObj.style.padding = '2px';
            is_inserting = true;
        } else if (obj.is_outside(get_coords(tree_app, e))) {
            if (inputObj.textContent) {
                obj.el_text.textContent = inputObj.textContent;
                obj.el_text.style.fill = 'black';
                obj.has_text = true;
            } else {
                obj.el_text.textContent = STD_TEXT;
                obj.el_text.style.fill = 'gray';
                obj.has_text = false;
            }

            centralize_text(obj.el_text);

            obj.el.removeChild(foreignObj as Node);
            inputObj = null;
            foreignObj = null;
            is_inserting = false;
            obj = null;
        }  
    };

    tree_app.tree_grid.addEventListener('keyup', (e) => {
        if (e.code === 'Enter' && obj !== null && inputObj !== null) {
            if (inputObj.textContent) {
                obj.el_text.textContent = inputObj.textContent;
                obj.el_text.style.fill = 'black';
                obj.has_text = true;
            } else {
                obj.el_text.textContent = STD_TEXT;
                obj.el_text.style.fill = 'gray';
                obj.has_text = false;
            }

            centralize_text(obj.el_text);

            obj.el.removeChild(foreignObj as Node);
            inputObj = null;
            foreignObj = null;
            is_inserting = false;
            obj = null;
        }
    });
    tree_app.tree_grid.addEventListener('mouseover',  handle_mouse_over);
    // tree_app.tree_grid.addEventListener('mouseout',  handle_mouse_out);
    tree_app.tree_grid.addEventListener('mousedown',  handle_mouse_down);

    tree_app.events.push(['mouseover', handle_mouse_over]);
    // tree_app.events.push(['mouseout', handle_mouse_out]);
    tree_app.events.push(['mousedown', handle_mouse_down]);
}

function switch_mode(tree_app: TreeApp, mode: ModeStrings, type_el?: TypeElStrings): void {
    if (Mode[mode] === Mode[tree_app.current_mode] && type_el === tree_app.current_type_el) {
        return;
    }
    console.log(`Switching to ${mode}.`);
    document.getElementsByTagName('body')[0].style.cursor = 'default';
    tree_app.current_mode = mode;
    tree_app.current_type_el = type_el;
    switch (Mode[mode]) {
        case Mode.INITIAL_MODE:
            initial_set_up(tree_app);
            break;
        case Mode.NORMAL_MODE:
            set_normal_mode(tree_app);
            break;
        case Mode.INSERT_MODE:
            if (type_el === undefined) throw new Error('The type of element is undefined');
            console.log(`Inserting ${type_el}.`);
            switch (TypeEl[type_el]) {
                case TypeEl.BOND:
                    set_insert_mode_bond(tree_app);
                    break;
                case TypeEl.OBJ:
                    set_insert_mode_obj(tree_app);
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


function initial_set_up(tree_app: TreeApp): void {
    const screen_w  = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
    const screen_h = window.innerHeight|| document.documentElement.clientHeight|| document.body.clientHeight;
    const x = Math.floor((BOARD_SIZE_X - screen_w) / 2);
    const y = Math.floor((BOARD_SIZE_Y - screen_h) / 2);
    tree_app.tree_grid.setAttribute('viewBox', `${x} ${y} ${screen_w} ${screen_h}`);
    tree_app.tree_grid.setAttribute('width', screen_w.toString());
    tree_app.tree_grid.setAttribute('height', screen_h.toString());

    const grid_pat = document.getElementById('grid-pat');
    //TODO
    if (grid_pat === null) throw new Error('');
    grid_pat.setAttribute('width', (GRID_SIZE*2).toString());
    grid_pat.setAttribute('height', (GRID_SIZE*2).toString());

    grid_pat.insertAdjacentHTML('beforeend', `<rect x='0'  y='0'  width='${GRID_SIZE}' height='${GRID_SIZE}' fill="white"/>`)
    grid_pat.insertAdjacentHTML('beforeend', `<rect x='${GRID_SIZE}'  y='0'  width='${GRID_SIZE}' height='${GRID_SIZE}' fill="gainsboro"/>`)
    grid_pat.insertAdjacentHTML('beforeend', `<rect x='${GRID_SIZE}'  y='${GRID_SIZE}'  width='${GRID_SIZE}' height='${GRID_SIZE}' fill="white"/>`)
    grid_pat.insertAdjacentHTML('beforeend', `<rect x='0'  y='${GRID_SIZE}'  width='${GRID_SIZE}' height='${GRID_SIZE}' fill="gainsboro"/>`)

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
        const screen_w  = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
        const screen_h = window.innerHeight|| document.documentElement.clientHeight|| document.body.clientHeight;
        const x = Math.floor((BOARD_SIZE_X - screen_w) / 2);
        const y = Math.floor((BOARD_SIZE_Y - screen_h) / 2);
        tree_app.tree_grid.setAttribute('viewBox', `${x} ${y} ${screen_w} ${screen_h}`);
        tree_app.tree_grid.setAttribute('width', `${screen_w}`);
        tree_app.tree_grid.setAttribute('height', `${screen_h}`);
        menu_grid.style.top = ((screen_h-Number(menu_grid.getAttribute('height')))/2).toString();
    }});

    const normal_mode_el = document.getElementById('normal-mode')
    if (normal_mode_el === null) throw new Error('Id "normal-mode" not found');
    const insert_obj_el = document.getElementById('insert-obj')
    if (insert_obj_el === null) throw new Error('ID `insert-obj` is not found!');
    const insert_text_el = document.getElementById('insert-text');
    if (insert_text_el === null) throw new Error('ID `insert-text` is not found!');
    const insert_bond_el = document.getElementById('insert-bond')
    if (insert_bond_el === null) throw new Error('Id "insert-bond" not found');
    
    const modes: [HTMLElement, ModeStrings, TypeElStrings][] = [
        [normal_mode_el, 'NORMAL_MODE', 'UNDEFINIED'],
        [insert_obj_el,  'INSERT_MODE', 'OBJ'],
        [insert_text_el, 'INSERT_MODE', 'TEXT'],
        [insert_bond_el, 'INSERT_MODE', 'BOND']
    ];

    for (const [mode, mode_name, type_el] of modes) {
        mode.addEventListener('click', (e) => {
            switch_mode(tree_app, mode_name, type_el);
            for (const [e, ..._] of modes) e.classList.remove('active');
            mode.classList.add('active');
        });
    }

    let w_tmp, h_tmp;
    // window.addEventListener('keyup', (e) => {
    //     switch (e.code) {
    //     case 'KeyC':
    //         switch_mode(tree_app, "INSERT_MODE", "OBJ");
    //         break;
    //     case 'KeyV':
    //         switch_mode(tree_app, "INSERT_MODE", "BOND");
    //         break;
    //     case 'KeyN':
    //         switch_mode(tree_app, "NORMAL_MODE");
    //         break;
    //     case 'Backslash':
    //         w_tmp = tree_app.tree_grid.viewBox.baseVal.width;
    //         h_tmp = tree_app.tree_grid.viewBox.baseVal.height;
    //         tree_app.tree_grid.viewBox.baseVal.width /= SCALE_FACTOR;
    //         tree_app.tree_grid.viewBox.baseVal.height /= SCALE_FACTOR;
    //         tree_app.tree_grid.viewBox.baseVal.x += w_tmp/(SCALE_FACTOR*4);
    //         tree_app.tree_grid.viewBox.baseVal.y += h_tmp/(SCALE_FACTOR*4);
    //         break;
    //     case 'BracketRight':
    //         w_tmp = tree_app.tree_grid.viewBox.baseVal.width;
    //         h_tmp = tree_app.tree_grid.viewBox.baseVal.height;
    //         tree_app.tree_grid.viewBox.baseVal.width *= SCALE_FACTOR;
    //         tree_app.tree_grid.viewBox.baseVal.height *= SCALE_FACTOR;
    //         tree_app.tree_grid.viewBox.baseVal.x += w_tmp*(1-SCALE_FACTOR)/2;
    //         tree_app.tree_grid.viewBox.baseVal.y += h_tmp*(1-SCALE_FACTOR)/2;
    //         break;
    //     case 'ArrowUp':
    //         tree_app.tree_grid.viewBox.baseVal.y += GRID_SIZE;
    //         break;
    //     case 'ArrowDown':
    //         tree_app.tree_grid.viewBox.baseVal.y -= GRID_SIZE;
    //         break;
    //     case 'ArrowRight':
    //         tree_app.tree_grid.viewBox.baseVal.x -= GRID_SIZE;
    //         break;
    //     case 'ArrowLeft':
    //         tree_app.tree_grid.viewBox.baseVal.x += GRID_SIZE;
    //         break;
    //     case 'KeyZ':
    //         tree_app.tree_grid.viewBox.baseVal.y = 0;
    //         tree_app.tree_grid.viewBox.baseVal.x = 0;
    //         break;
    //     default:
    //         console.log(e.code);
    //     }
    // });
}


console.info("DOM loaded");
const tree_grid = document.getElementById('tree_grid') as SVGSVGElement | null;
if (tree_grid === null) throw new Error('No DOMElement with id `tree_grid` is found');
const elements = document.getElementById('elements') as SVGGElement | null;
if (elements === null) throw new Error('No DOMElement with id `elements` is found');
var tree_app: TreeApp = {
    tree_grid,
    elements,
    pool: new Pool(),
    current_mode: "UNDEFINIED",
    current_type_el: undefined,
    events: [],
    tmp_element: null,
};
function main() {
    switch_mode(tree_app, "INITIAL_MODE");
    console.log(`Starting in ${tree_app.current_mode}`);
    switch_mode(tree_app, "NORMAL_MODE");
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", main);
} else {
    main();
}
//TODO 
//1) Verificar se já não há um vínculo entre dois objetos
//2) Substituir a tag <text> pelo <div> com <p> ou <text wrapper> editável, pois a tag <text> é ruim para criar multilinhas.
//3) Botão e função para deletar objetos e vínculos
//4) Implementar no modo normal uma maneira de mover vínculos, em cada uma das pontas, seja na saída seja na entrada
//5) Adicionar um cursor customizado para cada uma das funções do menu
// https://blog.logrocket.com/creating-custom-mouse-cursor-css/
//6) Arrastar o viewport com o mouse
//7) UI-icones para zoom in and out
//8) Aumentar a velocidade do panning quando muito em zoom out
//9) Talvez inverter as teclas para padding
//10) A ideia do starter_points é um pouco idiota e não ajuda nada na performance
