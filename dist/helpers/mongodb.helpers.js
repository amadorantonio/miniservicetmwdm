"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongodb_1 = require("mongodb");
const debug_1 = require("../utils/debug");
const debug = debug_1.DEBUG();
const color = debug_1.COLOR();
class MongoDB {
    constructor(CONFIG) {
        this.port = CONFIG.MONGODB.PORT;
        if (CONFIG.MONGODB.USER_NAME != '') {
            this.dbUri = `mongodb://${CONFIG.MONGODB.USER_NAME}:${CONFIG.MONGODB.USER_PASSWORD}@${CONFIG.MONGODB.HOST}:${CONFIG.MONGODB.PORT}/${CONFIG.MONGODB.DEFAULT_DATABASE}`;
        }
        else {
            this.dbUri = `mongodb//${CONFIG.MONGODB.HOST}:${CONFIG.MONGODB.PORT}/${CONFIG.MONGODB.DEFAULT_DATABASE}`;
        }
    }
    static getInstance(CONFIG) {
        return this._instance || (this._instance = new this(CONFIG));
    }
    connect() {
        return __awaiter(this, void 0, void 0, function* () {
            yield mongodb_1.MongoClient.connect(this.dbUri, { useNewUrlParser: true, useUnifiedTopology: true }).then((connection) => {
                debug.express(`El servidor ${color.mongoDB('MongoDB')} se inició ${color.succes('correctamente')} en el puerto ${color.info(this.port)}`);
                this.cnn = connection;
                this.db = this.cnn.db();
            }).catch((err) => {
                console.log('Ocurrió un error al conectarse a MongoDB', err);
            });
        });
    }
    setDataBase(dbName) {
        this.db = this.cnn.db(dbName);
    }
}
exports.default = MongoDB;
