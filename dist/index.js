"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
// Debug and Color Imports
const debug_1 = require("./utils/debug");
// APIUtils import
const api_utils_1 = require("./utils/api.utils");
const env_production_1 = __importDefault(require("./enviroments/env.production"));
//Cors
const cors_1 = __importDefault(require("cors"));
//SocketIO
const socket_io_1 = __importDefault(require("socket.io"));
const socket = __importStar(require("./sockets/socket"));
const http_1 = __importDefault(require("http"));
const body_parser_1 = __importDefault(require("body-parser"));
const debug = debug_1.DEBUG();
const color = debug_1.COLOR();
const app = express_1.default();
const httpServer = new http_1.default.Server(app);
const io = socket_io_1.default(httpServer);
const apiUtils = api_utils_1.APIUtils(env_production_1.default);
app.use(express_1.default.urlencoded({ extended: true }));
app.use(express_1.default.json());
//BodyParser
app.use(body_parser_1.default.urlencoded({ extended: true }));
//Cors
app.use(cors_1.default({ origin: true, credentials: true }));
console.log('Escuchando conexiones - sockets');
io.on('connection', cliente => {
    console.log('Cliente conectado');
    //Desconectar
    socket.desconectar(cliente);
});
app.post('/test', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    let message = req.body['message'];
    console.log(message);
    io.emit('testsocket', message);
    res.status(200).json(apiUtils.BodyResponse(api_utils_1.apiStatusEnum.Succes, 'OK', 'La solicitud ha tenido exito', {
        message
    }));
}));
app.get('/test', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    let message = req.body['message'];
    console.log(message);
    io.emit('testsocket', message);
    res.status(200).json(apiUtils.BodyResponse(api_utils_1.apiStatusEnum.Succes, 'OK', 'La solicitud ha tenido exito', {
        message
    }));
}));
httpServer.listen(env_production_1.default.API.PORT, () => __awaiter(void 0, void 0, void 0, function* () {
    debug.express(`El servidor ${color.express('Express')} se inició ${color.succes('correctamente')} en el puerto ${color.info(env_production_1.default.API.PORT)}`);
}));
