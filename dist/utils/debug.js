"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.COLOR = exports.DEBUG = void 0;
const chalk_1 = __importDefault(require("chalk"));
exports.DEBUG = () => {
    return {
        express: require('debug')('api:[Express]'),
        mongoDB: require('debug')('api:[MongoDB]')
    };
};
exports.COLOR = () => {
    return {
        express: chalk_1.default.bgHex('#333333').whiteBright.bold,
        mongoDB: chalk_1.default.bgHex('#412F20').hex('#589636').bold,
        succes: chalk_1.default.greenBright.bold,
        danger: chalk_1.default.redBright.bold,
        warning: chalk_1.default.yellowBright.bold,
        info: chalk_1.default.white.bold
    };
};
