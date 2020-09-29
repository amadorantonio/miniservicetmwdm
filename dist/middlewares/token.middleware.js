"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const api_utils_1 = require("../utils/api.utils");
const env_production_1 = __importDefault(require("../enviroments/env.production"));
//const apiUtils = APIUtils(ENV);
exports.default = (CONFIG) => {
    const apiUtils = api_utils_1.APIUtils(env_production_1.default);
    return {
        verify: (req, res, next) => {
            res.header("Access-Control-Allow-Origin", "*");
            res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
            const baererHeader = req.headers['authorization'];
            if (typeof baererHeader != 'undefined') {
                const baerer = baererHeader.split(' ');
                const bearerToken = baerer[1];
                jsonwebtoken_1.default.verify(bearerToken, CONFIG.TOKEN.SECRET_KEY, (err, tokenDecoded) => {
                    if (err) {
                        return res.status(api_utils_1.apiStatusEnum.Forbidden).json(apiUtils.BodyResponse(api_utils_1.apiStatusEnum.Forbidden, 
                        //Descripcion
                        'Acceso Prohibido al verificar el token', 
                        //Mensaje
                        'El token proporcionado no es valido, favor de verificar', 
                        //result
                        {}, 
                        //error
                        err));
                    }
                    //req.body.authUser = tokenDecoded;
                    next();
                });
            }
            else {
                // Unautorized
                return res.status(api_utils_1.apiStatusEnum.Forbidden).json(apiUtils.BodyResponse(api_utils_1.apiStatusEnum.Unauthorized, 
                //Descripcion
                'Acceso NO autorizado', 
                //Mensaje
                'Necesita proporiconar un Token para acceder a la solicitud', 
                //result
                {}, 
                //error
                {}));
            }
        }
    };
};
