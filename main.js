"use strict";
const MAX_GRID_X = 100;
const MAX_GRID_Y = 100;
const GRID_SIZE = 20;
const BOARD_SIZE_X = MAX_GRID_X * GRID_SIZE * 5;
const BOARD_SIZE_Y = MAX_GRID_Y * GRID_SIZE * 5;
const OBJ_COLOR = '#f2f2e2';
const OBJ_COLOR_ACTIVE = '#ffffee';
const OBJ_COLOR_MOVE = '#fffff0a0';
const PAN_SPEED = 5;
const SCALE_FACTOR = 1.5;
const D_SCALE_FACTOR = 0.9;
const STD_TEXT = 'Insira o texto aqui';
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
var TypeTmp;
(function (TypeTmp) {
    TypeTmp[TypeTmp["OBJ"] = 0] = "OBJ";
    TypeTmp[TypeTmp["TEXT"] = 1] = "TEXT";
    TypeTmp[TypeTmp["LINE"] = 2] = "LINE";
})(TypeTmp || (TypeTmp = {}));
class Vector2 {
    x;
    y;
    matrix;
    constructor(x, y) {
        this.matrix = new DOMMatrix([x, 0, 0, y, 0, 0]);
        this.x = x;
        this.y = y;
    }
    static zero() {
        return new Vector2(0, 0);
    }
    static from_mouse(e) {
        return new Vector2(e.clientX, e.clientY);
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
    set_xy(x, y) {
        this.matrix.a = x;
        this.matrix.d = y;
        this.x = x;
        this.y = y;
    }
    set_from_vector(v) {
        this.set_xy(v.x, v.y);
    }
}
const OBJ_DIM = new Vector2(15 * GRID_SIZE, 6 * GRID_SIZE);
class ElBond {
    el_key;
    el;
    constructor(el0, el1, tree_app) {
        this.el = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        this.move_to(el0, el1);
        this.el.setAttribute('stroke', 'black');
        this.el.setAttribute('stroke-width', '7');
        this.el.setAttribute('marker-start', 'url(#dot)');
        this.el.setAttribute('marker-end', 'url(#triangle)');
        this.el.classList.add('draggable');
        this.el_key = tree_app.pool.push(this, tree_app.svg_groups.elements);
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
    el_text_wrapper;
    el_text;
    has_text;
    el_key = -1;
    childrens;
    coords;
    size;
    start_points;
    constructor(coords, size, tree_app) {
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
        this.el_text.style.wordWrap = 'break-word';
        this.el_text.style.wordBreak = 'break-word';
        this.el_text.style.width = `${(size.x - 20)}px`;
        this.el_text.style.height = `${(size.y - 20)}px`;
        this.el_text.style.position = 'relative';
        this.el_text.style.top = '8px';
        this.el_text.style.left = '8px';
        this.el_text.style.color = 'gray';
        this.el_text.style.display = 'grid';
        this.el_text.style.alignItems = 'center';
        this.el_text.style.textAlign = 'center';
        this.el_text.style.userSelect = 'none';
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
    get_start_points() {
        const left_point = Vector2.zero();
        const right_point = Vector2.zero();
        const top_point = Vector2.zero();
        const bottom_point = Vector2.zero();
        left_point.x = this.coords.x;
        left_point.y = this.coords.y + this.size.y / 2;
        right_point.x = this.coords.x + this.size.x;
        right_point.y = this.coords.y + this.size.y / 2;
        top_point.x = this.coords.x + this.size.x / 2;
        top_point.y = this.coords.y;
        bottom_point.x = this.coords.x + this.size.x / 2;
        bottom_point.y = this.coords.y + this.size.y;
        return [left_point, right_point, top_point, bottom_point];
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
            || e_coords.x > this.coords.x + this.size.x
            || e_coords.y < this.coords.y
            || e_coords.y > this.coords.y + this.size.y;
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
        tree_app.svg_groups.tree_grid.removeEventListener(type, fun);
    }
}
function clean_tmps(tree_app) {
    while (tree_app.tmps.length) {
        const [type, el_key] = tree_app.tmps.pop();
        switch (type) {
            case TypeTmp.OBJ:
            case TypeTmp.LINE:
                tree_app.pool.remove(el_key, tree_app.svg_groups.elements);
                break;
            case TypeTmp.TEXT:
                const obj = tree_app.pool.get(el_key);
                obj.el.setAttribute('fill', OBJ_COLOR);
                obj.el_text.style.border = '';
                obj.el_text.contentEditable = 'false';
                break;
        }
    }
    if (tree_app.current_state.active_obj !== null) {
        const obj = tree_app.pool.get(tree_app.current_state.active_obj);
        obj.el.removeChild(obj.el.getElementsByClassName('delete')[0]);
        tree_app.current_state.active_obj = null;
    }
}
function cleaner(tree_app) {
    clean_tmps(tree_app);
    clean_events(tree_app);
}
function search_obj(tree_app, target, target_class) {
    let obj_tmp = null;
    for (let i = 0; i < 3 && target !== null && target !== undefined; ++i) {
        if (target.matches(`.${target_class}`)) {
            obj_tmp = tree_app.pool.get_from_svg(target);
            break;
        }
        target = target.parentElement;
    }
    return obj_tmp;
}
function create_delete_icon(tree_app, obj) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('x', '0');
    svg.setAttribute('y', '-40');
    svg.setAttribute('width', '30');
    svg.setAttribute('height', '30');
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
    svg.addEventListener('click', (e) => {
        if (e.button === 0) {
            tree_app.pool.remove(obj.el_key, tree_app.svg_groups.elements);
            tree_app.current_state.active_obj = null;
        }
    });
    obj.el.appendChild(svg);
    return svg;
}
let modes;
let normal_mode;
let normal_mode_el;
let insert_obj_el;
let insert_bond_el;
let insert_text_el;
const wrapper_handler_window_keyup_switch_modes = (e) => {
    handler_window_keyup_switch_modes(e, tree_app);
};
const handler_window_keyup_switch_modes = (e, tree_app) => {
    switch (e.code) {
        case 'KeyN':
            switch_mode(tree_app, e, "NORMAL_MODE");
            for (const [e, ..._] of modes)
                e.classList.remove('active');
            if (normal_mode_el !== null)
                normal_mode_el.classList.add('active');
            break;
        case 'KeyC':
            switch_mode(tree_app, e, "INSERT_MODE", "OBJ");
            for (const [e, ..._] of modes)
                e.classList.remove('active');
            if (insert_obj_el !== null)
                insert_obj_el.classList.add('active');
            break;
        case 'KeyV':
            switch_mode(tree_app, e, "INSERT_MODE", "BOND");
            for (const [e, ..._] of modes)
                e.classList.remove('active');
            if (insert_bond_el !== null)
                insert_bond_el.classList.add('active');
            break;
        case 'KeyT':
            switch_mode(tree_app, e, "INSERT_MODE", "TEXT");
            for (const [e, ..._] of modes)
                e.classList.remove('active');
            if (insert_text_el !== null)
                insert_text_el.classList.add('active');
            break;
    }
};
function reset_zoom_and_pan(tree_app) {
    const screen_w = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
    const screen_h = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
    const x = Math.floor((BOARD_SIZE_X - screen_w) / 2);
    const y = Math.floor((BOARD_SIZE_Y - screen_h) / 2);
    tree_app.svg_groups.tree_grid.setAttribute('viewBox', `${x} ${y} ${screen_w} ${screen_h}`);
    tree_app.svg_groups.tree_grid.setAttribute('width', screen_w.toString());
    tree_app.svg_groups.tree_grid.setAttribute('height', screen_h.toString());
    tree_app.current_state.zoom_pan_state.zoom_level = 0;
}
function zoom_in(tree_app) {
    if (tree_app.current_state.zoom_pan_state.zoom_level < tree_app.limits.max_zoom_in) {
        tree_app.current_state.zoom_pan_state.zoom_level += 1;
        const w = tree_app.svg_groups.tree_grid.viewBox.baseVal.width;
        const h = tree_app.svg_groups.tree_grid.viewBox.baseVal.height;
        tree_app.svg_groups.tree_grid.viewBox.baseVal.width /= SCALE_FACTOR;
        tree_app.svg_groups.tree_grid.viewBox.baseVal.height /= SCALE_FACTOR;
        tree_app.current_state.zoom_pan_state.pan_x += w / (SCALE_FACTOR * 4);
        tree_app.current_state.zoom_pan_state.pan_y += h / (SCALE_FACTOR * 4);
    }
}
function zoom_out(tree_app) {
    if (tree_app.current_state.zoom_pan_state.zoom_level > tree_app.limits.max_zoom_out) {
        tree_app.current_state.zoom_pan_state.zoom_level -= 1;
        const w = tree_app.svg_groups.tree_grid.viewBox.baseVal.width;
        const h = tree_app.svg_groups.tree_grid.viewBox.baseVal.height;
        tree_app.svg_groups.tree_grid.viewBox.baseVal.width *= SCALE_FACTOR;
        tree_app.svg_groups.tree_grid.viewBox.baseVal.height *= SCALE_FACTOR;
        tree_app.current_state.zoom_pan_state.pan_x += w * (1 - SCALE_FACTOR) / 2;
        tree_app.current_state.zoom_pan_state.pan_y += h * (1 - SCALE_FACTOR) / 2;
    }
}
const wrapper_handler_window_keyup_zoom_and_pan = (e) => {
    handler_window_keyup_zoom_and_pan(e, tree_app);
};
const handler_window_keyup_zoom_and_pan = (e, tree_app) => {
    switch (e.code) {
        case 'Backslash':
            zoom_in(tree_app);
            break;
        case 'BracketRight':
            zoom_out(tree_app);
            break;
        case 'ArrowUp':
            tree_app.current_state.zoom_pan_state.pan_y -= GRID_SIZE * PAN_SPEED;
            break;
        case 'ArrowDown':
            tree_app.current_state.zoom_pan_state.pan_y += GRID_SIZE * PAN_SPEED;
            break;
        case 'ArrowRight':
            tree_app.current_state.zoom_pan_state.pan_x += GRID_SIZE * PAN_SPEED;
            break;
        case 'ArrowLeft':
            tree_app.current_state.zoom_pan_state.pan_x -= GRID_SIZE * PAN_SPEED;
            break;
        case 'KeyH':
            reset_zoom_and_pan(tree_app);
            break;
    }
};
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
function set_normal_mode(tree_app) {
    let el_dragged = null;
    let is_dragging = false;
    const offset = Vector2.zero();
    const displacement = Vector2.zero();
    const handle_mouse_move = throttle((e) => {
        if (!is_dragging)
            return;
        if (el_dragged instanceof ElObj) {
            el_dragged.el.style.cursor = 'grabbing';
            el_dragged.move_to(get_coords(tree_app).sub(offset).div(GRID_SIZE).round().scale(GRID_SIZE));
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
        else if (el_dragged instanceof SVGSVGElement) {
            tree_app.svg_groups.tree_grid.style.cursor = 'grabbing';
            displacement.set_from_vector(mouse_coords.sub(offset));
            offset.set_from_vector(mouse_coords);
            tree_app.current_state.zoom_pan_state.pan_x -= displacement.x;
            tree_app.current_state.zoom_pan_state.pan_y -= displacement.y;
        }
    }, 16.67);
    const handle_mouse_move_grid = (e) => {
        if (!is_dragging)
            return;
    };
    const handle_mouse_over = (e) => {
        const obj = search_obj(tree_app, e.target, 'draggable');
        if (is_dragging || obj === null)
            return;
        obj.el.setAttribute('fill', OBJ_COLOR_ACTIVE);
    };
    const handle_mouse_out = (e) => {
        const obj = search_obj(tree_app, e.target, 'draggable');
        if (!is_dragging && obj !== null)
            obj.el.setAttribute('fill', OBJ_COLOR);
    };
    const handle_mouse_down = (e) => {
        const target = e.target;
        if (e.button !== 0)
            return;
        if (target !== null && target.id === 'grid') {
            el_dragged = tree_app.svg_groups.tree_grid;
            is_dragging = true;
            offset.set_from_vector(mouse_coords);
        }
        else {
            const obj_tmp = search_obj(tree_app, target, 'draggable');
            if (obj_tmp !== null) {
                el_dragged = obj_tmp;
                el_dragged.el.setAttribute('fill', OBJ_COLOR_MOVE);
                is_dragging = true;
                offset.set_from_vector(get_coords(tree_app).sub(el_dragged.coords));
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
    const handle_mouse_up = async (e) => {
        if (el_dragged instanceof ElObj) {
            el_dragged.el.setAttribute('fill', OBJ_COLOR_ACTIVE);
            el_dragged.el.style.cursor = 'pointer';
        }
        const is_svg = el_dragged instanceof SVGSVGElement;
        el_dragged = null;
        offset.set_xy(0, 0);
        is_dragging = false;
        let d = new Vector2(displacement.x, displacement.y).scale(D_SCALE_FACTOR);
        displacement.set_xy(0, 0);
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
    tree_app.svg_groups.tree_grid.addEventListener('mouseout', handle_mouse_out);
    tree_app.svg_groups.tree_grid.addEventListener('mousedown', handle_mouse_down);
    tree_app.svg_groups.tree_grid.addEventListener('mousemove', handle_mouse_move);
    tree_app.svg_groups.tree_grid.addEventListener('mousemove', handle_mouse_move_grid);
    tree_app.svg_groups.tree_grid.addEventListener('mouseup', handle_mouse_up);
    tree_app.events.push(['mouseover', handle_mouse_over]);
    tree_app.events.push(['mouseout', handle_mouse_out]);
    tree_app.events.push(['mousedown', handle_mouse_down]);
    tree_app.events.push(['mousemove', handle_mouse_move]);
    tree_app.events.push(['mousemove', handle_mouse_move_grid]);
    tree_app.events.push(['mouseup', handle_mouse_up]);
}
const mouse_coords = Vector2.zero();
const global_mouse_position = (e) => {
    mouse_coords.set_xy(e.clientX, e.clientY);
};
window.addEventListener('mousemove', global_mouse_position);
function get_coords(tree_app) {
    const ctm = tree_app.svg_groups.tree_grid.getScreenCTM();
    if (ctm === null)
        throw new Error('No possible to get screen CTM.');
    const padding = new Vector2(tree_app.current_state.zoom_pan_state.pan_x, tree_app.current_state.zoom_pan_state.pan_y);
    return mouse_coords.multiply(ctm.inverse()).add(padding);
}
function set_insert_mode_bond(tree_app) {
    let starter_obj = null;
    let line = null;
    let is_putting = false;
    const handle_mouse_over = (e) => {
        const target = e.target;
        const obj = search_obj(tree_app, target, 'obj');
        if (obj !== null && (starter_obj === null || starter_obj.el_key !== obj.el_key)) {
            obj.el.setAttribute('fill', OBJ_COLOR_ACTIVE);
        }
    };
    const handle_mouse_down = (e) => {
        const target = e.target;
        const obj = search_obj(tree_app, target, 'obj');
        if (e.button !== 0)
            return;
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
            starter_obj = obj;
            starter_obj.el.setAttribute('fill', OBJ_COLOR_ACTIVE);
            line = new ElBond(starter_obj, get_coords(tree_app), tree_app);
            tree_app.tmps.push([TypeTmp.LINE, line.el_key]);
            is_putting = true;
            return;
        }
        if (starter_obj !== null && line !== null) {
            let is_bonded = false;
            ;
            for (const [_, other_obj_key] of starter_obj.childrens.values()) {
                is_bonded = obj.el_key === other_obj_key;
            }
            if (!is_bonded) {
                line.move_to(starter_obj, obj);
                starter_obj.el.setAttribute('fill', OBJ_COLOR);
                obj.el.setAttribute('fill', OBJ_COLOR);
                starter_obj.childrens.set(line.el_key, ['s', obj.el_key]);
                obj.childrens.set(line.el_key, ['e', starter_obj.el_key]);
                tree_app.tmps.pop();
                is_putting = false;
                starter_obj = null;
                line = null;
            }
        }
    };
    const handle_mouse_move = throttle((e) => {
        if (is_putting && starter_obj !== null && line !== null) {
            line.move_to_insert_mode(starter_obj, get_coords(tree_app), 50);
        }
    }, 16.67);
    const handle_mouse_out = (e) => {
        const target = e.target;
        const obj = search_obj(tree_app, target, 'obj');
        if (obj !== null && (starter_obj === null || starter_obj.el_key !== obj.el_key)) {
            obj.el.setAttribute('fill', OBJ_COLOR);
        }
    };
    tree_app.svg_groups.tree_grid.addEventListener('mouseover', handle_mouse_over);
    tree_app.svg_groups.tree_grid.addEventListener('mouseout', handle_mouse_out);
    tree_app.svg_groups.tree_grid.addEventListener('mousemove', handle_mouse_move);
    tree_app.svg_groups.tree_grid.addEventListener('mousedown', handle_mouse_down);
    tree_app.events.push(['mouseover', handle_mouse_over]);
    tree_app.events.push(['mouseout', handle_mouse_out]);
    tree_app.events.push(['mousemove', handle_mouse_move]);
    tree_app.events.push(['mousedown', handle_mouse_down]);
}
function set_insert_mode_obj(tree_app, e) {
    let is_putting = false;
    let starter_obj = null;
    let obj = null;
    const handle_mouse_move = (e) => {
        if (obj !== null) {
            obj.move_to(get_coords(tree_app).sub(obj.size.div(2)).div(GRID_SIZE).round().scale(GRID_SIZE));
            is_putting = true;
        }
    };
    const handle_mouse_over = (e) => {
        if (obj === null) {
            const coords = get_coords(tree_app).sub(OBJ_DIM.div(2));
            obj = new ElObj(coords, OBJ_DIM, tree_app);
            tree_app.tmps.push([TypeTmp.OBJ, obj.el_key]);
            tree_app.svg_groups.tree_grid.removeEventListener('mouseover', handle_mouse_over);
            tree_app.svg_groups.tree_grid.addEventListener('mousemove', handle_mouse_move);
        }
    };
    const handle_mouse_click = (e) => {
        if (obj === null || !is_putting || e.button !== 0)
            return;
        tree_app.svg_groups.tree_grid.removeEventListener('mousemove', handle_mouse_move);
        tree_app.svg_groups.tree_grid.addEventListener('mouseover', handle_mouse_over);
        tree_app.tmps.pop();
        obj.el.setAttribute('fill', OBJ_COLOR);
        obj.el_text.setAttribute('fill', 'gray');
        obj = null;
        is_putting = false;
        starter_obj = null;
    };
    tree_app.svg_groups.tree_grid.addEventListener('mouseover', handle_mouse_over);
    tree_app.svg_groups.tree_grid.addEventListener('click', handle_mouse_click);
    tree_app.events.push(['mouseover', handle_mouse_over]);
    tree_app.events.push(['click', handle_mouse_click]);
    tree_app.events.push(['mousemove', handle_mouse_move]);
    if (e !== null && e.code === 'KeyC') {
        const coords = get_coords(tree_app).sub(OBJ_DIM.div(2)).div(GRID_SIZE).round().scale(GRID_SIZE);
        obj = new ElObj(coords, OBJ_DIM, tree_app);
        tree_app.tmps.push([TypeTmp.OBJ, obj.el_key]);
        tree_app.svg_groups.tree_grid.removeEventListener('mouseover', handle_mouse_over);
        tree_app.svg_groups.tree_grid.addEventListener('mousemove', handle_mouse_move);
    }
}
function set_insert_mode_text(tree_app) {
    let is_inserting = false;
    let obj = null;
    const handle_mouse_over = (e) => {
        const target = e.target;
        const obj_tmp = search_obj(tree_app, target, 'obj');
        if (obj === null && obj_tmp !== null) {
            obj = obj_tmp;
            obj.el.setAttribute('fill', OBJ_COLOR_ACTIVE);
            obj.el_text.style.border = '2px dashed cadetblue';
            obj.el_text.contentEditable = 'true';
            tree_app.tmps.push([TypeTmp.TEXT, obj.el_key]);
        }
        else if (!is_inserting && obj !== null && obj_tmp === null) {
            obj.el.setAttribute('fill', OBJ_COLOR);
            obj.el_text.style.border = '';
            obj.el_text.contentEditable = 'false';
            obj = null;
            tree_app.tmps.pop();
        }
    };
    const handle_mouse_down = (e) => {
        if (obj === null || e.button !== 0)
            return;
        if (!is_inserting) {
            if (!obj.has_text) {
                obj.el_text.textContent = '';
            }
            obj.el_text.style.border = '';
            obj.el_text.style.padding = '2px';
            obj.el_text.style.userSelect = 'text';
            is_inserting = true;
            window.removeEventListener('keyup', wrapper_handler_window_keyup_switch_modes);
            window.removeEventListener('keyup', wrapper_handler_window_keyup_zoom_and_pan);
        }
        else if (obj.is_outside(get_coords(tree_app))) {
            if (obj.el_text.textContent !== null && obj.el_text.textContent.trim()) {
                obj.el_text.textContent = obj.el_text.textContent.trim();
                obj.el_text.style.color = 'black';
                obj.has_text = true;
            }
            else {
                obj.el_text.textContent = STD_TEXT;
                obj.el_text.style.color = 'gray';
                obj.has_text = false;
            }
            is_inserting = false;
            obj.el_text.style.userSelect = 'none';
            obj.el_text.contentEditable = 'false';
            obj.el_text.style.padding = '';
            obj = null;
            tree_app.tmps.pop();
            window.addEventListener('keyup', wrapper_handler_window_keyup_switch_modes);
            window.addEventListener('keyup', wrapper_handler_window_keyup_zoom_and_pan);
        }
    };
    const handle_key_up = (e) => {
        if (obj === null)
            return;
        console.log(e);
        if (e.code === 'Enter' || e.code === 'Escape') {
            if (obj.el_text.textContent !== null && obj.el_text.textContent.trim()) {
                obj.el_text.textContent = obj.el_text.textContent.trim();
                obj.el_text.style.color = 'black';
                obj.has_text = true;
            }
            else {
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
        }
        else {
        }
    };
    tree_app.svg_groups.tree_grid.addEventListener('keyup', handle_key_up);
    tree_app.svg_groups.tree_grid.addEventListener('mouseover', handle_mouse_over);
    tree_app.svg_groups.tree_grid.addEventListener('mousedown', handle_mouse_down);
    tree_app.events.push(['mouseover', handle_mouse_over]);
    tree_app.events.push(['mousedown', handle_mouse_down]);
    tree_app.events.push(['keyup', handle_key_up]);
}
function switch_mode(tree_app, e, mode, type_el) {
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
            if (type_el === undefined)
                throw new Error('The type of element is undefined');
            console.log(`Inserting ${type_el}.`);
            switch (TypeEl[type_el]) {
                case TypeEl.BOND:
                    set_insert_mode_bond(tree_app);
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
const center = Vector2.zero();
function set_initial_mode(tree_app) {
    const screen_w = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
    const screen_h = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
    const x = Math.floor((BOARD_SIZE_X - screen_w) / 2);
    const y = Math.floor((BOARD_SIZE_Y - screen_h) / 2);
    center.set_xy(x, y);
    tree_app.svg_groups.tree_grid.setAttribute('viewBox', `${x} ${y} ${screen_w} ${screen_h}`);
    tree_app.svg_groups.tree_grid.setAttribute('width', screen_w.toString());
    tree_app.svg_groups.tree_grid.setAttribute('height', screen_h.toString());
    tree_app.current_state.zoom_pan_state.pan_x = tree_app.svg_groups.tree_grid.viewBox.baseVal.x;
    tree_app.current_state.zoom_pan_state.pan_y = tree_app.svg_groups.tree_grid.viewBox.baseVal.y;
    const grid_pat = document.getElementById('grid-pat');
    if (grid_pat === null)
        throw new Error('HTML element with ID `grid-pat` not found!');
    grid_pat.setAttribute('width', (GRID_SIZE * 2).toString());
    grid_pat.setAttribute('height', (GRID_SIZE * 2).toString());
    grid_pat.insertAdjacentHTML('beforeend', `<rect x='0'  y='0'  width='${GRID_SIZE}' height='${GRID_SIZE}' fill="white"/>`);
    grid_pat.insertAdjacentHTML('beforeend', `<rect x='${GRID_SIZE}'  y='0'  width='${GRID_SIZE}' height='${GRID_SIZE}' fill="rgb(240, 240, 240)"/>`);
    grid_pat.insertAdjacentHTML('beforeend', `<rect x='${GRID_SIZE}'  y='${GRID_SIZE}'  width='${GRID_SIZE}' height='${GRID_SIZE}' fill="white"/>`);
    grid_pat.insertAdjacentHTML('beforeend', `<rect x='0'  y='${GRID_SIZE}'  width='${GRID_SIZE}' height='${GRID_SIZE}' fill="rgb(240, 240, 240)"/>`);
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
            center.set_xy(x, y);
            tree_app.svg_groups.tree_grid.setAttribute('viewBox', `${x} ${y} ${screen_w} ${screen_h}`);
            tree_app.svg_groups.tree_grid.setAttribute('width', `${screen_w}`);
            tree_app.svg_groups.tree_grid.setAttribute('height', `${screen_h}`);
            menu_grid.style.top = ((screen_h - Number(menu_grid.getAttribute('height'))) / 2).toString();
        }
    });
    normal_mode_el = document.getElementById('normal-mode');
    if (normal_mode_el === null)
        throw new Error('Id "normal-mode" not found');
    insert_obj_el = document.getElementById('insert-obj');
    if (insert_obj_el === null)
        throw new Error('ID `insert-obj` is not found!');
    insert_bond_el = document.getElementById('insert-bond');
    if (insert_bond_el === null)
        throw new Error('Id "insert-bond" not found');
    insert_text_el = document.getElementById('insert-text');
    if (insert_text_el === null)
        throw new Error('ID `insert-text` is not found!');
    modes = [
        [normal_mode_el, 'NORMAL_MODE', 'UNDEFINIED'],
        [insert_obj_el, 'INSERT_MODE', 'OBJ'],
        [insert_bond_el, 'INSERT_MODE', 'BOND'],
        [insert_text_el, 'INSERT_MODE', 'TEXT'],
    ];
    for (const [mode, mode_name, type_el] of modes) {
        mode.addEventListener('click', (e) => {
            switch_mode(tree_app, null, mode_name, type_el);
            for (const [e, ..._] of modes)
                e.classList.remove('active');
            mode.classList.add('active');
        });
    }
    const home_el = document.getElementById('home');
    if (home_el === null)
        throw new Error('Id `home` not found');
    const zoom_in_el = document.getElementById('zoom-in');
    if (zoom_in_el === null)
        throw new Error('ID `zoom-in` is not found!');
    const zoom_out_el = document.getElementById('zoom-out');
    if (zoom_out_el === null)
        throw new Error('Id `zoom-out` not found');
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
}
function proxy_zoom_pan_constructor(zoom_pan_holder) {
    return new Proxy(zoom_pan_holder, {
        set(target, property, value) {
            if (value === Infinity)
                return false;
            target[property] = value;
            if (property == 'pan_x') {
                tree_app.svg_groups.tree_grid.viewBox.baseVal.x = value;
            }
            else if (property == 'pan_y') {
                tree_app.svg_groups.tree_grid.viewBox.baseVal.y = value;
            }
            const home_icon = document.getElementById('home');
            if (home_icon === null)
                throw new Error('Could not found id `home`in document!');
            if (property === 'zoom_level') {
                if (value)
                    home_icon.style.display = 'inline';
                else
                    home_icon.style.display = 'none';
            }
            else {
                if (target['pan_x'] !== center.x || target['pan_y'] !== center.y)
                    home_icon.style.display = 'inline';
                else
                    home_icon.style.display = 'none';
            }
            return true;
        },
    });
}
let tree_app;
function main() {
    console.info("DOM loaded");
    const tree_grid = document.getElementById('tree_grid');
    if (tree_grid === null)
        throw new Error('No DOMElement with id `tree_grid` is found');
    const elements = document.getElementById('elements');
    if (elements === null)
        throw new Error('No DOMElement with id `elements` is found');
    const tmps = document.getElementById('tmps');
    if (tmps === null)
        throw new Error('No DOMElement with id `tmps` is found');
    const zoom_pan_holder = {
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
            max_zoom_out: -4,
            max_zoom_in: 3,
        }
    };
    switch_mode(tree_app, null, "INITIAL_MODE");
    console.log(`Starting in ${tree_app.current_mode}`);
    switch_mode(tree_app, null, "NORMAL_MODE");
    if (normal_mode_el !== null)
        normal_mode_el.classList.add('active');
}
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", main);
}
else {
    main();
}
