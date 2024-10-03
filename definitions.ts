import { ElLine, Pool, Vector2 } from './common.js'

export const WIDTH  = 1000;
export const HEIGHT = 1000;
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

export type El = Obj | Bond;
export type Bond = ElLine;
export type ModeStrings = keyof typeof Mode;
export type ObjStrings = keyof typeof TypeObj;
export type ElKey = number | null;
export type LineType = 's' | 'e';
export type SVGTypes = SVGRectElement;
export type TreeApp = {
    tree_grid: SVGSVGElement,
    elements: SVGGElement,
    pool: Pool,
    current_mode: ModeStrings,
    events: Events,
}
export type ElPool = Map<ElKey, El>;

export type Vector4 = [number, number, number, number]; 
export type StartPoints = [Vector2, Vector2, Vector2, Vector2];
