"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.APIUtils = exports.apiStatusEnum = void 0;
var apiStatusEnum;
(function (apiStatusEnum) {
    apiStatusEnum[apiStatusEnum["Succes"] = 200] = "Succes";
    apiStatusEnum[apiStatusEnum["Creaated"] = 201] = "Creaated";
    apiStatusEnum[apiStatusEnum["Bad_Request"] = 400] = "Bad_Request";
    apiStatusEnum[apiStatusEnum["Unauthorized"] = 401] = "Unauthorized";
    apiStatusEnum[apiStatusEnum["Forbidden"] = 403] = "Forbidden";
    apiStatusEnum[apiStatusEnum["Internal_Server_Error"] = 500] = "Internal_Server_Error";
})(apiStatusEnum = exports.apiStatusEnum || (exports.apiStatusEnum = {}));
exports.APIUtils = (ENV) => {
    return {
        BodyResponse: (status, description, message, result = null, error = null) => {
            return {
                microService: ENV.API.NAME,
                enviroment: ENV.API.ENVIROMENT,
                status,
                description,
                message,
                result,
                error
            };
        }
    };
};
