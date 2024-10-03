import { throttle, Vector2 } from './common.js';
import { scale_factor, min_x, min_y } from './main.js';
var el_dragged;
var is_dragging;
const handle_mouse_move_El = throttle((e, offset) => {
    if (is_dragging && el_dragged !== null) {
        const x = (e.clientX * scale_factor) + min_x - offset.x;
        const y = (e.clientY * scale_factor) + min_y - offset.y;
        el_dragged.move_to(x, y);
    }
}, 16.67);
const handle_mouse_move_line = throttle((e, tree_app) => {
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
    target.setAttribute('fill', 'red');
};
const handle_mouse_out = (e) => {
    const target = e.target;
    if (target === null || !target.matches('.draggable')) {
        return;
    }
    if (!is_dragging) {
        target.setAttribute('fill', 'gray');
    }
};
const handle_mouse_down = (e, tree_app, offset) => {
    const target = e.target;
    if (target === null || !target.matches('.draggable')) {
        return;
    }
    el_dragged = tree_app.pool.get_from_svg(target);
    el_dragged.el.setAttribute('fill', 'red');
    is_dragging = true;
    const ctm = el_dragged.el.getScreenCTM();
    let pt = tree_app.tree_grid.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    pt = pt.matrixTransform(ctm.inverse());
    offset.x = pt.x - el_dragged.x;
    offset.y = pt.y - el_dragged.y;
};
const handle_mouse_up = (e) => {
    is_dragging = false;
    el_dragged = null;
};
export function set_normal_mode(tree_app) {
    var offset = new Vector2(0, 0);
    var el_dragged = null;
    var is_dragging = false;
    while (tree_app.events.length > 0) {
        const [type, fun] = tree_app.events.pop();
        tree_app.tree_grid.removeEventListener(type, fun);
    }
    const wrapper_mouse_down = (e) => {
        return handle_mouse_down(e, tree_app, offset);
    };
    const wrapper_mouse_move_El = (e) => {
        return handle_mouse_move_El(e, offset);
    };
    const wrapper_mouse_move_line = (e) => {
        return handle_mouse_move_line(e, tree_app);
    };
    tree_app.tree_grid.addEventListener('mouseover', handle_mouse_over);
    tree_app.tree_grid.addEventListener('mouseout', handle_mouse_out);
    tree_app.tree_grid.addEventListener('mousedown', wrapper_mouse_down);
    tree_app.tree_grid.addEventListener('mousemove', wrapper_mouse_move_El);
    tree_app.tree_grid.addEventListener('mousemove', wrapper_mouse_move_line);
    tree_app.tree_grid.addEventListener('mouseup', handle_mouse_up);
    tree_app.events.push(['mouseover', handle_mouse_over]);
    tree_app.events.push(['mouseout', handle_mouse_out]);
    tree_app.events.push(['mousedown', wrapper_mouse_down]);
    tree_app.events.push(['mousemove', wrapper_mouse_move_El]);
    tree_app.events.push(['mousemove', wrapper_mouse_move_line]);
    tree_app.events.push(['mouseup', handle_mouse_up]);
}
