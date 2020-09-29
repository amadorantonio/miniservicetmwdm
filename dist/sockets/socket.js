"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.desconectar = void 0;
exports.desconectar = (cliente) => {
    cliente.on('disconnect', () => {
        console.log('Cliente desconectado');
    });
};
