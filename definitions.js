export const WIDTH = 1000;
export const HEIGHT = 1000;
export var Mode;
(function (Mode) {
    Mode[Mode["INITIAL_MODE"] = 0] = "INITIAL_MODE";
    Mode[Mode["NORMAL_MODE"] = 1] = "NORMAL_MODE";
    Mode[Mode["INSERT_MODE"] = 2] = "INSERT_MODE";
    Mode[Mode["UNDEFINIED"] = -1] = "UNDEFINIED";
})(Mode || (Mode = {}));
export var TypeObj;
(function (TypeObj) {
    TypeObj[TypeObj["BOND_OBJ"] = 0] = "BOND_OBJ";
    TypeObj[TypeObj["RECT_OBJ"] = 1] = "RECT_OBJ";
})(TypeObj || (TypeObj = {}));
