"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
    API: {
        NAME: 'Micro-Servicio Sistema de Control de Presidencia | NODEJs',
        PORT: 5000,
        ENVIRONMENT: 'Development'
    },
    NOTIFY: {
        DELAY: 1000 * 10 // 10 Segundos
    },
    TOKEN: {
        SECRET_KEY: "Pr351d3nc14_Poder$_judic14l",
        //EXPIRES: 60 * 60 * 4    // 4 Horas
        EXPIRES: 60 * 60 * 12 // 12 horas
    },
    MONGODB: {
        HOST: 'localhost',
        PORT: 27017,
        USER_NAME: 'dba-operador',
        USER_PASSWORD: 'operador123',
        DEFAULT_DATABASE: 'presidencia'
    }
};
