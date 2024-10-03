import { switch_mode } from './main.js';
import { throttle, Vector2, ElRect, ElLine, getRandomRange } from './common.js';
import { WIDTH, HEIGHT } from './definitions.js';
var starter_obj;
var line;
var is_putting;
export function create_rect(tree_app) {
    const rect = new ElRect(getRandomRange(0, WIDTH - 110), getRandomRange(0, HEIGHT - 110), 100, 100);
    rect.el.setAttribute('rx', '15');
    rect.el.setAttribute('fill', 'gray');
    rect.el.classList.add('draggable');
    rect.el_key = tree_app.pool.push(rect, tree_app.elements);
}
export function create_line(tree_app, starter_obj, points) {
    const line = new ElLine(starter_obj, points);
    line.el_key = tree_app.pool.push(line, tree_app.elements);
    return line;
}
const handle_mouse_over = (e) => {
    const target = e.target;
    if (target === null || !target.matches('.draggable')) {
        return;
    }
    if (starter_obj === null || starter_obj.el_key !== Number(target.getAttribute('el_key'))) {
        target.setAttribute('fill', 'red');
    }
};
const handle_mouse_down = (e, tree_app) => {
    const target = e.target;
    console.log(target);
    if (target === null || !target.matches('.draggable')) {
        if (is_putting) {
            is_putting = false;
            if (starter_obj !== null) {
                starter_obj.el.setAttribute('fill', 'gray');
                starter_obj = null;
            }
            if (line !== null) {
                tree_app.pool.remove(line.el_key, tree_app.elements);
                line = null;
            }
        }
        return;
    }
    const obj = tree_app.pool.get_from_svg(target);
    if (is_putting && starter_obj !== null && line !== null) {
        line.move_to(starter_obj, obj);
        starter_obj.childrens.set(line.el_key, ['s', obj.el_key]);
        obj.childrens.set(line.el_key, ['e', starter_obj.el_key]);
        is_putting = false;
        switch_mode(tree_app, "NORMAL_MODE");
    }
    else {
        starter_obj = obj;
        target.setAttribute('fill', 'yellow');
        const mouse_coords = new Vector2(e.clientX, e.clientY);
        line = create_line(tree_app, starter_obj, mouse_coords);
        is_putting = true;
    }
};
const handle_mouse_move = throttle((e) => {
    if (is_putting && starter_obj !== null && line !== null) {
        let mouse_coords = new Vector2(e.clientX, e.clientY);
        //TODO angle 
        if (starter_obj.x > mouse_coords.x) {
            mouse_coords.x += 50;
        }
        else {
            mouse_coords.x -= 50;
        }
        if (starter_obj.y > mouse_coords.y) {
            mouse_coords.y += 50;
        }
        else {
            mouse_coords.y -= 50;
        }
        line.move_to(starter_obj, mouse_coords);
    }
}, 16.67);
const handle_mouse_out = (e) => {
    const target = e.target;
    if (target === null || !target.matches('.draggable')) {
        return;
    }
    if (starter_obj === null || starter_obj.el_key !== Number(target.getAttribute('el_key'))) {
        target.setAttribute('fill', 'gray');
    }
};
export function set_insert_mode(tree_app) {
    is_putting = false;
    starter_obj = null;
    line = null;
    while (tree_app.events.length > 0) {
        const [type, fun] = tree_app.events.pop();
        tree_app.tree_grid.removeEventListener(type, fun);
    }
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
