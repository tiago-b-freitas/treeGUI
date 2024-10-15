"use strict";
const MAX_GRID_X = 40;
const MAX_GRID_Y = 30;
const GRID_SIZE = 20;
const BOARD_SIZE_X = MAX_GRID_X * GRID_SIZE * 5;
const BOARD_SIZE_Y = MAX_GRID_Y * GRID_SIZE * 5;
const RECT_COLOR = '#f2f2e2';
const RECT_COLOR_ACTIVE = '#ffffee';
const RECT_COLOR_MOVE = '#fffff0a0';
class Vector2 {
    x;
    y;
    matrix;
    constructor(x, y) {
        this.matrix = new DOMMatrixReadOnly([x, 0, 0, y, 0, 0]);
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
    round() {
        return new Vector2(Math.round(this.x), Math.round(this.y));
    }
    multiply(other_matrix) {
        const tmp_matrix = this.matrix.multiply(other_matrix);
        return new Vector2(tmp_matrix.a, tmp_matrix.d);
    }
}
class ElLine {
    el_key;
    el;
    constructor(el0, el1) {
        this.el_key = null;
        this.el = (document.createElementNS('http://www.w3.org/2000/svg', 'line'));
        this.move_to(el0, el1);
        this.el.setAttribute('stroke', 'black');
        this.el.setAttribute('stroke-width', '7');
        this.el.setAttribute('marker-start', 'url(#dot)');
        this.el.setAttribute('marker-end', 'url(#triangle)');
        this.el.setAttribute('class', 'draggable');
    }
    move_to(el0, el1) {
        if (el1 instanceof ElRect) {
            var [x1, y1, x2, y2] = el0.smallest_way_from_el(el1);
        }
        else if (el1 instanceof Vector2) {
            var [x1, y1, x2, y2] = el0.smallest_way_from_points(el1);
        }
        else {
            throw new Error(`Improper class ${typeof el1}`);
        }
        this.el.setAttribute('x1', x1.toString());
        this.el.setAttribute('y1', y1.toString());
        this.el.setAttribute('x2', x2.toString());
        this.el.setAttribute('y2', y2.toString());
    }
    move_to_insert_mode(el0, el1, length) {
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
class ElRect {
    el;
    el_key = -1;
    childrens;
    coords;
    w;
    h;
    start_points;
    left_point;
    right_point;
    top_point;
    bottom_point;
    constructor(x, y, w, h) {
        let rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        this.el = rect;
        this.coords = new Vector2(x, y);
        this.el.setAttribute('x', this.coords.x.toString());
        this.el.setAttribute('y', this.coords.y.toString());
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
        this.left_point.x = this.coords.x;
        this.left_point.y = this.coords.y + this.h / 2;
        this.right_point.x = this.coords.x + this.w;
        this.right_point.y = this.coords.y + this.h / 2;
        this.top_point.x = this.coords.x + this.w / 2;
        this.top_point.y = this.coords.y;
        this.bottom_point.x = this.coords.x + this.w / 2;
        this.bottom_point.y = this.coords.y + this.h;
        return [this.left_point, this.right_point, this.top_point, this.bottom_point];
    }
    move_to(coords) {
        this.coords = coords;
        this.el.setAttribute('x', this.coords.x.toString());
        this.el.setAttribute('y', this.coords.y.toString());
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
class Pool {
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
function throttle(func, delay) {
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
function clean_events(tree_app) {
    while (tree_app.events.length > 0) {
        const [type, fun] = tree_app.events.pop();
        tree_app.tree_grid.removeEventListener(type, fun);
    }
}
function getRandomRange(min, max) {
    return Math.random() * (max - min) + min;
}
var Mode;
(function (Mode) {
    Mode[Mode["INITIAL_MODE"] = 0] = "INITIAL_MODE";
    Mode[Mode["NORMAL_MODE"] = 1] = "NORMAL_MODE";
    Mode[Mode["INSERT_MODE"] = 2] = "INSERT_MODE";
    Mode[Mode["UNDEFINIED"] = -1] = "UNDEFINIED";
})(Mode || (Mode = {}));
var TypeEl;
(function (TypeEl) {
    TypeEl[TypeEl["BOND"] = 0] = "BOND";
    TypeEl[TypeEl["OBJ"] = 1] = "OBJ";
})(TypeEl || (TypeEl = {}));
function clean_tmps(tree_app) {
    console.log(tree_app.tmp_element);
    if (tree_app.tmp_element !== null) {
        tree_app.pool.remove(tree_app.tmp_element, tree_app.elements);
        tree_app.tmp_element = null;
    }
}
function cleaner(tree_app) {
    clean_tmps(tree_app);
    clean_events(tree_app);
}
function set_normal_mode(tree_app) {
    var el_dragged = null;
    var is_dragging = false;
    var offset;
    cleaner(tree_app);
    const handle_mouse_move_El = throttle((e) => {
        if (is_dragging && el_dragged !== null) {
            const el_ctm = tree_app.tree_grid.getScreenCTM();
            if (el_ctm === null)
                throw new Error(`Not possible to retrieve el CTM from target ${el_dragged}`);
            const padding = new Vector2(tree_app.tree_grid.viewBox.baseVal.x, tree_app.tree_grid.viewBox.baseVal.y);
            const coords = new Vector2(e.clientX, e.clientY).multiply(el_ctm.inverse());
            el_dragged.move_to(coords.add(padding).sub(offset).div(GRID_SIZE).round().scale(GRID_SIZE));
        }
    }, 16.67);
    const handle_mouse_move_line = throttle((e) => {
        if (is_dragging && el_dragged !== null) {
            for (const [line_key, [line_type, other_el_key]] of el_dragged.childrens) {
                const line = tree_app.pool.get(line_key);
                const other_el = tree_app.pool.get(other_el_key);
                if (line_type === 's') {
                    line.move_to(el_dragged, other_el);
                }
                else if (line_type === 'e') {
                    line.move_to(other_el, el_dragged);
                }
            }
        }
    }, 16.67);
    const handle_mouse_over = (e) => {
        const target = e.target;
        if (is_dragging || target === null || !target.matches('.draggable')) {
            return;
        }
        target.setAttribute('fill', RECT_COLOR_ACTIVE);
    };
    const handle_mouse_out = (e) => {
        const target = e.target;
        if (target === null || !target.matches('.draggable')) {
            return;
        }
        if (!is_dragging) {
            target.setAttribute('fill', RECT_COLOR);
        }
    };
    const handle_mouse_down = (e) => {
        const target = e.target;
        if (target === null || !target.matches('.draggable')) {
            return;
        }
        el_dragged = tree_app.pool.get_from_svg(target);
        el_dragged.el.setAttribute('fill', RECT_COLOR_MOVE);
        is_dragging = true;
        const screen_ctm = tree_app.tree_grid.getScreenCTM();
        if (screen_ctm === null)
            throw new Error(`Not possible to retrieve screen CTM from target ${target}`);
        let coords = new Vector2(e.clientX, e.clientY).multiply(screen_ctm.inverse());
        const padding = new Vector2(tree_app.tree_grid.viewBox.baseVal.x, tree_app.tree_grid.viewBox.baseVal.y);
        offset = coords.add(padding).sub(el_dragged.coords);
    };
    const handle_mouse_up = (e) => {
        is_dragging = false;
        if (el_dragged !== null)
            el_dragged.el.setAttribute('fill', RECT_COLOR_ACTIVE);
        el_dragged = null;
    };
    tree_app.tree_grid.addEventListener('mouseover', handle_mouse_over);
    tree_app.tree_grid.addEventListener('mouseout', handle_mouse_out);
    tree_app.tree_grid.addEventListener('mousedown', handle_mouse_down);
    tree_app.tree_grid.addEventListener('mousemove', handle_mouse_move_El);
    tree_app.tree_grid.addEventListener('mousemove', handle_mouse_move_line);
    tree_app.tree_grid.addEventListener('mouseup', handle_mouse_up);
    tree_app.events.push(['mouseover', handle_mouse_over]);
    tree_app.events.push(['mouseout', handle_mouse_out]);
    tree_app.events.push(['mousedown', handle_mouse_down]);
    tree_app.events.push(['mousemove', handle_mouse_move_El]);
    tree_app.events.push(['mousemove', handle_mouse_move_line]);
    tree_app.events.push(['mouseup', handle_mouse_up]);
}
function create_rect(x, y, w, h, tree_app) {
    const rect = new ElRect(x, y, w, h);
    rect.el.setAttribute('fill', 'rgba(255, 255, 255, 0.3');
    rect.el.setAttribute('stroke', 'black');
    rect.el.classList.add('draggable');
    rect.el_key = tree_app.pool.push(rect, tree_app.elements);
    return rect;
}
function create_line(tree_app, starter_obj, points) {
    const line = new ElLine(starter_obj, points);
    line.el_key = tree_app.pool.push(line, tree_app.elements);
    return line;
}
function get_coords(tree_app, e) {
    const ctm = tree_app.tree_grid.getScreenCTM();
    if (ctm === null)
        throw new Error('No possible to get screen CTM.');
    let coords = new Vector2(e.clientX, e.clientY).multiply(ctm.inverse());
    const padding = new Vector2(tree_app.tree_grid.viewBox.baseVal.x, tree_app.tree_grid.viewBox.baseVal.y);
    return coords.add(padding);
}
function set_insert_mode_bond(tree_app) {
    var starter_obj = null;
    var line = null;
    var is_putting = false;
    cleaner(tree_app);
    const handle_mouse_over = (e) => {
        const target = e.target;
        if (target === null || !target.matches('.draggable')) {
            return;
        }
        if (starter_obj === null || starter_obj.el_key !== Number(target.getAttribute('el_key'))) {
            target.setAttribute('fill', RECT_COLOR_ACTIVE);
        }
    };
    const handle_mouse_down = (e, tree_app) => {
        const target = e.target;
        if (target === null || !target.matches('.draggable')) {
            if (is_putting) {
                is_putting = false;
                if (starter_obj !== null) {
                    starter_obj.el.setAttribute('fill', RECT_COLOR);
                    starter_obj = null;
                }
                if (line !== null && line.el_key !== null) {
                    tree_app.pool.remove(line.el_key, tree_app.elements);
                    line = null;
                }
            }
            return;
        }
        const obj = tree_app.pool.get_from_svg(target);
        if (is_putting && starter_obj !== null && line !== null) {
            line.move_to(starter_obj, obj);
            starter_obj.el.setAttribute('fill', RECT_COLOR);
            starter_obj.childrens.set(line.el_key, ['s', obj.el_key]);
            obj.childrens.set(line.el_key, ['e', starter_obj.el_key]);
            is_putting = false;
            starter_obj = null;
            line = null;
        }
        else {
            starter_obj = obj;
            target.setAttribute('fill', RECT_COLOR_ACTIVE);
            line = create_line(tree_app, starter_obj, get_coords(tree_app, e));
            is_putting = true;
        }
    };
    const handle_mouse_move = throttle((e) => {
        if (is_putting && starter_obj !== null && line !== null) {
            let mouse_coords = get_coords(tree_app, e);
            line.move_to_insert_mode(starter_obj, mouse_coords, 50);
        }
    }, 16.67);
    const handle_mouse_out = (e) => {
        const target = e.target;
        if (target === null || !target.matches('.draggable')) {
            return;
        }
        if (starter_obj === null || starter_obj.el_key !== Number(target.getAttribute('el_key'))) {
            target.setAttribute('fill', RECT_COLOR);
        }
    };
    const wrapper_mouse_down = (e) => {
        return handle_mouse_down(e, tree_app);
    };
    tree_app.tree_grid.addEventListener('mouseover', handle_mouse_over);
    tree_app.tree_grid.addEventListener('mouseout', handle_mouse_out);
    tree_app.tree_grid.addEventListener('mousemove', handle_mouse_move);
    tree_app.tree_grid.addEventListener('mousedown', wrapper_mouse_down);
    tree_app.events.push(['mouseover', handle_mouse_over]);
    tree_app.events.push(['mouseout', handle_mouse_out]);
    tree_app.events.push(['mousemove', handle_mouse_move]);
    tree_app.events.push(['mousedown', wrapper_mouse_down]);
}
function set_insert_mode_obj(tree_app) {
    let is_putting = false;
    let starter_obj = null;
    let rect = null;
    cleaner(tree_app);
    const handle_mouse_move = (e) => {
        if (rect === null)
            return;
        rect.move_to(get_coords(tree_app, e));
        is_putting = true;
    };
    const handle_mouse_over = (e) => {
        if (rect === null) {
            const ctm = tree_app.tree_grid.getScreenCTM();
            if (ctm === null)
                throw new Error('No possible to get screen CTM.');
            let coords = new Vector2(e.clientX, e.clientY).multiply(ctm.inverse());
            const padding = new Vector2(tree_app.tree_grid.viewBox.baseVal.x, tree_app.tree_grid.viewBox.baseVal.y);
            coords = coords.add(padding).div(GRID_SIZE).round().scale(GRID_SIZE);
            rect = create_rect(coords.x, coords.y, 10 * GRID_SIZE, 4 * GRID_SIZE, tree_app);
            tree_app.tmp_element = rect.el_key;
            tree_app.tree_grid.removeEventListener('mouseover', handle_mouse_over);
            tree_app.tree_grid.addEventListener('mousemove', handle_mouse_move);
        }
    };
    //https://www.color-hex.com/color-palette/104059
    const handle_mouse_click = (e) => {
        if (rect === null || !is_putting)
            return;
        tree_app.tree_grid.removeEventListener('mousemove', handle_mouse_move);
        tree_app.tree_grid.addEventListener('mouseover', handle_mouse_over);
        tree_app.tmp_element = null;
        rect.el.setAttribute('fill', RECT_COLOR);
        rect = null;
        is_putting = false;
        starter_obj = null;
    };
    tree_app.tree_grid.addEventListener('mouseover', handle_mouse_over);
    tree_app.tree_grid.addEventListener('click', handle_mouse_click);
    tree_app.events.push(['mouseover', handle_mouse_over]);
    tree_app.events.push(['click', handle_mouse_click]);
    tree_app.events.push(['mousemove', handle_mouse_move]);
}
function switch_mode(tree_app, mode, type_el) {
    if (Mode[mode] === Mode[tree_app.current_mode] && type_el === tree_app.current_type_el) {
        return;
    }
    console.log(`Switching to ${mode}.`);
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
            if (type_el === undefined)
                throw new Error('The type of element is undefined');
            console.log(`Inserting ${type_el}.`);
            switch (TypeEl[type_el]) {
                case TypeEl.BOND:
                    set_insert_mode_bond(tree_app);
                    break;
                case TypeEl.OBJ:
                    set_insert_mode_obj(tree_app);
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
function initial_set_up(tree_app) {
    const screen_w = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
    const screen_h = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
    const x = Math.floor((BOARD_SIZE_X - screen_w) / 2);
    const y = Math.floor((BOARD_SIZE_Y - screen_h) / 2);
    tree_app.tree_grid.setAttribute('viewBox', `${x} ${y} ${screen_w} ${screen_h}`);
    tree_app.tree_grid.setAttribute('width', screen_w.toString());
    tree_app.tree_grid.setAttribute('height', screen_h.toString());
    const grid_pat = document.getElementById('grid-pat');
    //TODO
    if (grid_pat === null)
        throw new Error('');
    grid_pat.setAttribute('width', (GRID_SIZE * 2).toString());
    grid_pat.setAttribute('height', (GRID_SIZE * 2).toString());
    grid_pat.insertAdjacentHTML('beforeend', `<rect x='0'  y='0'  width='${GRID_SIZE}' height='${GRID_SIZE}' fill="white"/>`);
    grid_pat.insertAdjacentHTML('beforeend', `<rect x='${GRID_SIZE}'  y='0'  width='${GRID_SIZE}' height='${GRID_SIZE}' fill="gainsboro"/>`);
    grid_pat.insertAdjacentHTML('beforeend', `<rect x='${GRID_SIZE}'  y='${GRID_SIZE}'  width='${GRID_SIZE}' height='${GRID_SIZE}' fill="white"/>`);
    grid_pat.insertAdjacentHTML('beforeend', `<rect x='0'  y='${GRID_SIZE}'  width='${GRID_SIZE}' height='${GRID_SIZE}' fill="gainsboro"/>`);
    const grid = document.getElementById('grid');
    if (grid === null)
        throw new Error('HTML element with ID `grid` is not found!');
    grid.setAttribute('width', (MAX_GRID_X * GRID_SIZE * 5).toString());
    grid.setAttribute('height', (MAX_GRID_Y * GRID_SIZE * 5).toString());
    grid.setAttribute('x', '0');
    grid.setAttribute('y', '0');
    const menu_grid = document.getElementById('menu-grid');
    if (menu_grid === null)
        throw new Error('HTML element with ID `menu-grid` is not found!');
    menu_grid.style.top = ((screen_h - Number(menu_grid.getAttribute('height'))) / 2).toString();
    window.addEventListener('resize', (event) => {
        {
            const screen_w = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
            const screen_h = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
            const x = Math.floor((BOARD_SIZE_X - screen_w) / 2);
            const y = Math.floor((BOARD_SIZE_Y - screen_h) / 2);
            tree_app.tree_grid.setAttribute('viewBox', `${x} ${y} ${screen_w} ${screen_h}`);
            tree_app.tree_grid.setAttribute('width', `${screen_w}`);
            tree_app.tree_grid.setAttribute('height', `${screen_h}`);
            menu_grid.style.top = ((screen_h - Number(menu_grid.getAttribute('height'))) / 2).toString();
        }
    });
    let normal_mode_el = document.getElementById('normal-mode');
    if (normal_mode_el === null)
        throw new Error('Id "normal-mode" not found');
    let insert_rect_el = document.getElementById('insert-rect');
    if (insert_rect_el === null)
        throw new Error('ID `insert-rect` is not found!');
    let insert_bond_el = document.getElementById('insert-bond');
    if (insert_bond_el === null)
        throw new Error('Id "insert-bond" not found');
    normal_mode_el.addEventListener('click', (e) => {
        switch_mode(tree_app, 'NORMAL_MODE');
        insert_rect_el.classList.remove('active');
        insert_bond_el.classList.remove('active');
        normal_mode_el.classList.add('active');
    });
    insert_rect_el.addEventListener('click', (e) => {
        switch_mode(tree_app, 'INSERT_MODE', 'OBJ');
        normal_mode_el.classList.remove('active');
        insert_bond_el.classList.remove('active');
        insert_rect_el.classList.add('active');
    });
    insert_bond_el.addEventListener('click', (e) => {
        switch_mode(tree_app, 'INSERT_MODE', 'BOND');
        normal_mode_el.classList.remove('active');
        insert_rect_el.classList.remove('active');
        insert_bond_el.classList.add('active');
    });
    let w_tmp, h_tmp;
    window.addEventListener('keyup', (e) => {
        switch (e.code) {
            case 'KeyC':
                switch_mode(tree_app, "INSERT_MODE", "OBJ");
                break;
            case 'KeyV':
                switch_mode(tree_app, "INSERT_MODE", "BOND");
                break;
            case 'KeyN':
                switch_mode(tree_app, "NORMAL_MODE");
                break;
            case 'Backslash':
                w_tmp = tree_app.tree_grid.viewBox.baseVal.width;
                h_tmp = tree_app.tree_grid.viewBox.baseVal.height;
                tree_app.tree_grid.viewBox.baseVal.width /= scale_factor;
                tree_app.tree_grid.viewBox.baseVal.height /= scale_factor;
                tree_app.tree_grid.viewBox.baseVal.x += w_tmp / (scale_factor * 4);
                tree_app.tree_grid.viewBox.baseVal.y += h_tmp / (scale_factor * 4);
                break;
            case 'BracketRight':
                w_tmp = tree_app.tree_grid.viewBox.baseVal.width;
                h_tmp = tree_app.tree_grid.viewBox.baseVal.height;
                tree_app.tree_grid.viewBox.baseVal.width *= scale_factor;
                tree_app.tree_grid.viewBox.baseVal.height *= scale_factor;
                tree_app.tree_grid.viewBox.baseVal.x += w_tmp * (1 - scale_factor) / 2;
                tree_app.tree_grid.viewBox.baseVal.y += h_tmp * (1 - scale_factor) / 2;
                break;
            case 'ArrowUp':
                tree_app.tree_grid.viewBox.baseVal.y += GRID_SIZE;
                break;
            case 'ArrowDown':
                tree_app.tree_grid.viewBox.baseVal.y -= GRID_SIZE;
                break;
            case 'ArrowRight':
                tree_app.tree_grid.viewBox.baseVal.x -= GRID_SIZE;
                break;
            case 'ArrowLeft':
                tree_app.tree_grid.viewBox.baseVal.x += GRID_SIZE;
                break;
            case 'KeyZ':
                tree_app.tree_grid.viewBox.baseVal.y = 0;
                tree_app.tree_grid.viewBox.baseVal.x = 0;
                break;
            default:
                console.log(e.code);
        }
    });
}
var scale_factor = 1.5;
console.info("DOM loaded");
const tree_grid = document.getElementById('tree_grid');
if (tree_grid === null)
    throw new Error('No DOMElement with id `tree_grid` is found');
const elements = document.getElementById('elements');
if (elements === null)
    throw new Error('No DOMElement with id `elements` is found');
var tree_app = {
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
}
else {
    main();
}
