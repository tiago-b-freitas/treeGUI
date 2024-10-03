import {getRandomRange, Pool, Mode, ModeStrings, ObjStrings, ElLine, ElRect,
        Vector2, ElKey, LineType, SVGTypes, El, TreeApp, ElPool, Events} from './common.js';
import { WIDTH, HEIGHT } from './definitions.js';
import * as normal from './normal_mode.js';
import * as insert from './insert_mode.js';


export function switch_mode(tree_app: TreeApp, mode: ModeStrings, obj?: ObjStrings): void {
    if (Mode[mode] === Mode[tree_app.current_mode]) {
        return;
    }
    console.log(`Switching to ${mode}.`);
    tree_app.current_mode = mode;
    switch (Mode[mode]) {
        case Mode.INITIAL_MODE:
            initial_set_up(tree_app);
            break;
        case Mode.NORMAL_MODE:
            normal.set_normal_mode(tree_app);
            break;
        case Mode.INSERT_MODE:
            if (obj === undefined) throw new Error(`The obj is undefined`);
            console.log(`Inserting ${obj}.`);
            insert.set_insert_mode(tree_app);
            break;
        default:
            throw new Error(`Current mode ${tree_app.current_mode} not implemented`);
    }
}

function initial_set_up(tree_app: TreeApp): void {
    tree_app.tree_grid.setAttribute('viewBox', `0 0 ${WIDTH} ${HEIGHT}`);
    tree_app.tree_grid.setAttribute('width', WIDTH.toString());
    tree_app.tree_grid.setAttribute('height', HEIGHT.toString());
    tree_app.tree_grid.setAttribute('background', "red");

    window.addEventListener('keyup', (e) => {
        switch (e.code) {
        case 'KeyC':
            insert.create_rect(tree_app);
            break;
        case 'KeyL':
            break;
        case 'KeyD':
            tree_app.pool.remove(0, tree_app.elements);
            break;
        case 'KeyV':
            switch_mode(tree_app, "INSERT_MODE", "BOND_OBJ");
            break;
        case 'KeyN':
            switch_mode(tree_app, "NORMAL_MODE");
            break;
        case 'Backslash':
            scale_factor -= 0.1;
            break;
        case 'BracketRight':
            scale_factor += 0.1;
            break;
        case 'ArrowUp':
            translate_vector2.y += 1/(scale_factor*scale_speed_atenuator);
            break;
        case 'ArrowDown':
            translate_vector2.y -= 1/(scale_factor*scale_speed_atenuator);
            break;
        case 'ArrowRight':
            translate_vector2.x -= 1/(scale_factor*scale_speed_atenuator);
            break;
        case 'ArrowLeft':
            translate_vector2.x += 1/(scale_factor*scale_speed_atenuator);
            break;
        default:
            console.log(e.code);
        }
        switch (e.code) {
        case 'Backslash':
        case 'BracketRight':
        case 'ArrowUp':
        case 'ArrowDown':
        case 'ArrowRight':
        case 'ArrowLeft':
            const width  = WIDTH*scale_factor;
            const height = HEIGHT*scale_factor;
            min_x  = (WIDTH - width)/2;
            min_y  = (HEIGHT - height)/2;
            min_y += translate_vector2.y*MOVE_GRID_SPEED*width/WIDTH;
            min_x += translate_vector2.x*MOVE_GRID_SPEED*height/HEIGHT;
            // min_y = 0;
            // min_x = 0;
            tree_app.tree_grid.setAttribute('viewBox', `${min_x} ${min_y} ${width} ${height}`);
        break;
        }
    });
}

const MOVE_GRID_SPEED = 100;
export var scale_factor = 1;
var scale_speed_atenuator = 3;
var translate_vector2 = new Vector2(0, 0);
export var min_x = 0;
export var min_y = 0;
const grid_center = new Vector2(WIDTH, HEIGHT).div(2);

(() => {
    const tree_grid = document.getElementById('tree_grid') as SVGElement | null;
    if (tree_grid === null) throw new Error('No DOMElement with id `tree_grid` is found');
    const elements = document.getElementById('elements') as SVGGElement | null;
    if (elements === null) throw new Error('No DOMElement with id `elements` is found');
    var tree_app: TreeApp = {
        tree_grid,
        elements,
        pool: new Pool(),
        current_mode: "UNDEFINIED",
        events: [],
    };

    switch_mode(tree_app, "INITIAL_MODE");
    console.log(`Starting in ${tree_app.current_mode}`);
    { // debug, temp
        insert.create_rect(tree_app);
        insert.create_rect(tree_app);
    }
    switch_mode(tree_app, "NORMAL_MODE");
    // switch_mode(tree_app, "INSERT_MODE", "BOND_OBJ");
})();

