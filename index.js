import { getRandomRange, Pool, Mode, ElLine, ElRect } from './common.js';
import * as normal from './normal_mode.js';
function create_rect(tree_app) {
    const rect = new ElRect(getRandomRange(0, 900), getRandomRange(0, 1500), 100, 100);
    rect.el.setAttribute('rx', '15');
    rect.el.setAttribute('fill', 'gray');
    rect.el.classList.add('draggable');
    rect.el_key = tree_app.pool.push(rect, tree_app.tree_canvas);
}
function create_line(tree_app) {
    const el0 = tree_app.pool.get(0);
    const el1 = tree_app.pool.get(1);
    const line = new ElLine(el0, el1);
    line.el_key = tree_app.pool.push(line, tree_app.tree_canvas);
    el0.childrens.push(['s', el1.el_key, line.el_key]);
    el1.childrens.push(['e', el0.el_key, line.el_key]);
}
function switch_mode(tree_app, mode, obj) {
    if (Mode[mode] === Mode[tree_app.current_mode]) {
        return;
    }
    console.log(`Switching to ${mode}.`);
    tree_app.current_mode = mode;
    switch (Mode[mode]) {
        case Mode.NORMAL_MODE:
            normal.set_normal_mode(tree_app);
            break;
        case Mode.INSERT_MODE:
            console.log(`Inserting ${obj}`);
            break;
        default:
            throw new Error(`Current mode ${tree_app.current_mode} not implemented`);
    }
}
(() => {
    const tree_canvas = document.getElementById('tree_canvas');
    if (tree_canvas === null)
        throw new Error('No canvas with id `tree_canvas` is found');
    const tree_app = {
        tree_canvas,
        pool: new Pool(),
        current_mode: "INITIAL_MODE",
    };
    console.log(`Starting in ${tree_app.current_mode}`);
    create_rect(tree_app);
    create_rect(tree_app);
    switch_mode(tree_app, "NORMAL_MODE");
    console.log(tree_app.tree_canvas);
    window.addEventListener('keyup', (e) => {
        switch (e.code) {
            case 'KeyC':
                create_rect(tree_app);
                break;
            case 'KeyL':
                if (tree_app.pool.el_key >= 2)
                    create_line(tree_app);
                break;
            case 'KeyD':
                tree_app.pool.remove(0, tree_canvas);
                break;
            case 'KeyV':
                switch_mode(tree_app, "INSERT_MODE", "BOND_OBJ");
                break;
            case 'KeyN':
                switch_mode(tree_app, "NORMAL_MODE");
                break;
        }
    });
})();
