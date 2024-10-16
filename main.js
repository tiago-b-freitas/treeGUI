"use strict";
const MAX_GRID_X = 40;
const MAX_GRID_Y = 30;
const GRID_SIZE = 20;
const BOARD_SIZE_X = MAX_GRID_X * GRID_SIZE * 5;
const BOARD_SIZE_Y = MAX_GRID_Y * GRID_SIZE * 5;
const OBJ_COLOR = '#f2f2e2';
const OBJ_COLOR_ACTIVE = '#ffffee';
const OBJ_COLOR_MOVE = '#fffff0a0';
const SCALE_FACTOR = 1.5;
const STD_TEXT = 'Insira o texto aqui';
class Vector2 {
    x;
    y;
    matrix;
    constructor(x, y) {
        this.matrix = new DOMMatrixReadOnly([x, 0, 0, y, 0, 0]);
        this.x = x;
        this.y = y;
    }
    static zero() {
        return new Vector2(0, 0);
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
const OBJ_DIM = new Vector2(15 * GRID_SIZE, 6 * GRID_SIZE);
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
        this.el.classList.add('draggable');
    }
    move_to(el0, el1) {
        if (el1 instanceof ElObj) {
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
class ElObj {
    el;
    el_rect;
    el_text;
    has_text;
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
        this.left_point = Vector2.zero();
        this.right_point = Vector2.zero();
        this.top_point = Vector2.zero();
        this.bottom_point = Vector2.zero();
        this.start_points = [this.left_point, this.right_point, this.top_point, this.bottom_point];
        this.move_to(this.coords);
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
        this.el.style.transform = `translate(${coords.x}px, ${coords.y}px)`;
        this.coords = coords;
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
    is_outside(e_coords) {
        return e_coords.x < this.coords.x
            || e_coords.x > this.coords.x + this.w
            || e_coords.y < this.coords.y
            || e_coords.y > this.coords.y + this.h;
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
    TypeEl[TypeEl["OBJ"] = 0] = "OBJ";
    TypeEl[TypeEl["TEXT"] = 1] = "TEXT";
    TypeEl[TypeEl["BOND"] = 2] = "BOND";
    TypeEl[TypeEl["UNDEFINIED"] = -1] = "UNDEFINIED";
})(TypeEl || (TypeEl = {}));
function clean_tmps(tree_app) {
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
    var offset = undefined;
    cleaner(tree_app);
    const handle_mouse_move_El = throttle((e) => {
        if (is_dragging && el_dragged !== null) {
            el_dragged.move_to(get_coords(tree_app, e).sub(offset).div(GRID_SIZE).round().scale(GRID_SIZE));
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
        if (is_dragging || target === null || target.parentElement === null || !target.parentElement.matches('.draggable'))
            return;
        target.parentElement.setAttribute('fill', OBJ_COLOR_ACTIVE);
    };
    const handle_mouse_out = (e) => {
        const target = e.target;
        if (target === null || target.parentElement === null || !target.parentElement.matches('.draggable'))
            return;
        if (!is_dragging) {
            target.parentElement.setAttribute('fill', OBJ_COLOR);
        }
    };
    const handle_mouse_down = (e) => {
        const target = e.target;
        if (target === null || target.parentElement === null || !target.parentElement.matches('.draggable'))
            return;
        el_dragged = tree_app.pool.get_from_svg(target.parentElement);
        el_dragged.el.setAttribute('fill', OBJ_COLOR_MOVE);
        is_dragging = true;
        offset = get_coords(tree_app, e).sub(el_dragged.coords);
    };
    const handle_mouse_up = (e) => {
        is_dragging = false;
        if (el_dragged !== null)
            el_dragged.el.setAttribute('fill', OBJ_COLOR_ACTIVE);
        el_dragged = null;
        offset = undefined;
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
function centralize_text(el_text) {
    const text_width = el_text.getBBox().width;
    const text_height = el_text.getBBox().height;
    el_text.setAttribute('x', ((OBJ_DIM.x - text_width) / 2).toString());
    el_text.setAttribute('y', ((OBJ_DIM.y + text_height / 2) / 2).toString());
}
function create_obj(coords, OBJ_DIM, tree_app) {
    const obj = new ElObj(coords.x, coords.y, OBJ_DIM.x, OBJ_DIM.y);
    obj.el_key = tree_app.pool.push(obj, tree_app.elements);
    centralize_text(obj.el_text);
    return obj;
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
    let starter_obj = null;
    let line = null;
    let is_putting = false;
    cleaner(tree_app);
    const handle_mouse_over = (e) => {
        const target = e.target;
        if (target === null || target.parentElement === null || !target.parentElement.matches('.draggable'))
            return;
        if (starter_obj === null || starter_obj.el_key !== Number(target.parentElement.getAttribute('el_key'))) {
            target.parentElement.setAttribute('fill', OBJ_COLOR_ACTIVE);
        }
    };
    const handle_mouse_down = (e, tree_app) => {
        const target = e.target;
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
        const obj = tree_app.pool.get_from_svg(target.parentElement);
        if (is_putting && starter_obj !== null && line !== null) {
            line.move_to(starter_obj, obj);
            starter_obj.el.setAttribute('fill', OBJ_COLOR);
            obj.el.setAttribute('fill', OBJ_COLOR);
            starter_obj.childrens.set(line.el_key, ['s', obj.el_key]);
            obj.childrens.set(line.el_key, ['e', starter_obj.el_key]);
            tree_app.tmp_element = null;
            is_putting = false;
            starter_obj = null;
            line = null;
        }
        else {
            starter_obj = obj;
            starter_obj.el.setAttribute('fill', OBJ_COLOR_ACTIVE);
            line = create_line(tree_app, starter_obj, get_coords(tree_app, e));
            tree_app.tmp_element = line.el_key;
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
        if (target === null || target.parentElement === null || !target.parentElement.matches('.draggable'))
            return;
        if (starter_obj === null || starter_obj.el_key !== Number(target.parentElement.getAttribute('el_key'))) {
            target.parentElement.setAttribute('fill', OBJ_COLOR);
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
    let obj = null;
    cleaner(tree_app);
    const handle_mouse_move = (e) => {
        if (obj === null)
            return;
        obj.move_to(get_coords(tree_app, e).sub(OBJ_DIM.div(2)).div(GRID_SIZE).round().scale(GRID_SIZE));
        is_putting = true;
    };
    const handle_mouse_over = (e) => {
        if (obj === null) {
            const coords = get_coords(tree_app, e).sub(OBJ_DIM.div(2));
            obj = create_obj(coords, OBJ_DIM, tree_app);
            tree_app.tmp_element = obj.el_key;
            tree_app.tree_grid.removeEventListener('mouseover', handle_mouse_over);
            tree_app.tree_grid.addEventListener('mousemove', handle_mouse_move);
        }
    };
    const handle_mouse_click = (e) => {
        if (obj === null || !is_putting)
            return;
        tree_app.tree_grid.removeEventListener('mousemove', handle_mouse_move);
        tree_app.tree_grid.addEventListener('mouseover', handle_mouse_over);
        tree_app.tmp_element = null;
        obj.el.setAttribute('fill', OBJ_COLOR);
        obj.el_text.setAttribute('fill', 'gray');
        obj = null;
        is_putting = false;
        starter_obj = null;
    };
    tree_app.tree_grid.addEventListener('mouseover', handle_mouse_over);
    tree_app.tree_grid.addEventListener('click', handle_mouse_click);
    tree_app.events.push(['mouseover', handle_mouse_over]);
    tree_app.events.push(['click', handle_mouse_click]);
    tree_app.events.push(['mousemove', handle_mouse_move]);
}
function set_insert_mode_text(tree_app) {
    let is_inserting = false;
    let foreignObj = null;
    let inputObj = null;
    let obj = null;
    cleaner(tree_app);
    document.getElementsByTagName('body')[0].style.cursor = 'text';
    const handle_mouse_over = (e) => {
        const target = e.target;
        if (obj === null && target !== null && target.parentElement !== null) {
            target.parentElement.setAttribute('fill', OBJ_COLOR_ACTIVE);
            if (target.parentElement.matches('.obj') && inputObj === null) {
                foreignObj = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
                foreignObj.setAttribute('x', '0');
                foreignObj.setAttribute('y', '0');
                foreignObj.setAttribute('width', (OBJ_DIM.x).toString());
                foreignObj.setAttribute('height', (OBJ_DIM.y).toString());
                inputObj = document.createElement('div');
                inputObj.contentEditable = 'true';
                inputObj.style.wordWrap = 'break-word';
                inputObj.style.wordBreak = 'break-word';
                inputObj.style.width = `${(OBJ_DIM.x - 20)}px`;
                inputObj.style.height = `${(OBJ_DIM.y - 20)}px`;
                inputObj.style.position = 'relative';
                inputObj.style.top = '8px';
                inputObj.style.left = '8px';
                inputObj.style.border = '2px dashed cadetblue';
                foreignObj.appendChild(inputObj);
                obj = tree_app.pool.get_from_svg(target.parentElement);
                obj.el.appendChild(foreignObj);
            }
        }
        if (!is_inserting && obj !== null && obj.is_outside(get_coords(tree_app, e))) {
            obj.el.setAttribute('fill', OBJ_COLOR);
            obj.el.removeChild(foreignObj);
            inputObj = null;
            foreignObj = null;
            obj = null;
        }
    };
    const handle_mouse_down = (e) => {
        if (obj === null || inputObj === null)
            return;
        if (!is_inserting) {
            if (obj.has_text) {
                inputObj.textContent = obj.el_text.textContent;
            }
            obj.el_text.textContent = '';
            inputObj.style.border = '';
            inputObj.style.padding = '2px';
            is_inserting = true;
        }
        else if (obj.is_outside(get_coords(tree_app, e))) {
            if (inputObj.textContent) {
                obj.el_text.textContent = inputObj.textContent;
                obj.el_text.style.fill = 'black';
                obj.has_text = true;
            }
            else {
                obj.el_text.textContent = STD_TEXT;
                obj.el_text.style.fill = 'gray';
                obj.has_text = false;
            }
            centralize_text(obj.el_text);
            obj.el.removeChild(foreignObj);
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
            }
            else {
                obj.el_text.textContent = STD_TEXT;
                obj.el_text.style.fill = 'gray';
                obj.has_text = false;
            }
            centralize_text(obj.el_text);
            obj.el.removeChild(foreignObj);
            inputObj = null;
            foreignObj = null;
            is_inserting = false;
            obj = null;
        }
    });
    tree_app.tree_grid.addEventListener('mouseover', handle_mouse_over);
    tree_app.tree_grid.addEventListener('mousedown', handle_mouse_down);
    tree_app.events.push(['mouseover', handle_mouse_over]);
    tree_app.events.push(['mousedown', handle_mouse_down]);
}
function switch_mode(tree_app, mode, type_el) {
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
function initial_set_up(tree_app) {
    const screen_w = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
    const screen_h = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
    const x = Math.floor((BOARD_SIZE_X - screen_w) / 2);
    const y = Math.floor((BOARD_SIZE_Y - screen_h) / 2);
    tree_app.tree_grid.setAttribute('viewBox', `${x} ${y} ${screen_w} ${screen_h}`);
    tree_app.tree_grid.setAttribute('width', screen_w.toString());
    tree_app.tree_grid.setAttribute('height', screen_h.toString());
    const grid_pat = document.getElementById('grid-pat');
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
    const normal_mode_el = document.getElementById('normal-mode');
    if (normal_mode_el === null)
        throw new Error('Id "normal-mode" not found');
    const insert_obj_el = document.getElementById('insert-obj');
    if (insert_obj_el === null)
        throw new Error('ID `insert-obj` is not found!');
    const insert_text_el = document.getElementById('insert-text');
    if (insert_text_el === null)
        throw new Error('ID `insert-text` is not found!');
    const insert_bond_el = document.getElementById('insert-bond');
    if (insert_bond_el === null)
        throw new Error('Id "insert-bond" not found');
    const modes = [
        [normal_mode_el, 'NORMAL_MODE', 'UNDEFINIED'],
        [insert_obj_el, 'INSERT_MODE', 'OBJ'],
        [insert_text_el, 'INSERT_MODE', 'TEXT'],
        [insert_bond_el, 'INSERT_MODE', 'BOND']
    ];
    for (const [mode, mode_name, type_el] of modes) {
        mode.addEventListener('click', (e) => {
            switch_mode(tree_app, mode_name, type_el);
            for (const [e, ..._] of modes)
                e.classList.remove('active');
            mode.classList.add('active');
        });
    }
    let w_tmp, h_tmp;
}
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
