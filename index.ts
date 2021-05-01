import Express from 'express';
import {Request, Response} from 'express';
// Debug and Color Imports
import {DEBUG, COLOR} from './utils/debug';
// APIUtils import
import { APIUtils, apiStatusEnum } from './utils/api.utils';
import ENV from './enviroments/env.production'
//Cors
import cors from 'cors';
//SocketIO
import socketIO from 'socket.io';
import * as socket from './sockets/socket';
import http from 'http';
import bodyParser, { json, text } from 'body-parser'
import { ObjectId } from 'mongodb';
import { error, info } from 'console';


const debug = DEBUG();
const color = COLOR();
const app = Express();
const httpServer = new http.Server(app);
const io = socketIO(httpServer); 
const apiUtils = APIUtils(ENV);

app.use(Express.urlencoded({extended:true}))
app.use(Express.json())
//BodyParser
app.use(bodyParser.urlencoded({extended: true}));
//Cors
app.use( cors({ origin: true, credentials: true}));

console.log('Escuchando conexiones - sockets');
io.on('connection', cliente => {
    console.log('Cliente conectado');

    //Desconectar
    socket.desconectar(cliente);
});

app.post('/test', async (req: Request, res: Response) => {
    let message = req.body['message']
    io.emit('testsocket', message);
    res.status(200).json(
        apiUtils.BodyResponse(
            apiStatusEnum.Succes, 'OK', 'La solicitud ha tenido exito', 
            {
                message
            }
        )
    );
});

app.get('/test', async (req: Request, res: Response) => {
    let message: any = {'message': 'Prueba exitosa'}
    res.status(200).json(
        apiUtils.BodyResponse(
            apiStatusEnum.Succes, 'OK', 'La solicitud ha tenido exito', 
            {
                message
            }
        )
    );
});


httpServer.listen(ENV.API.PORT, async() => { 
    debug.express(`El servidor ${color.express('Express')} se inició ${color.succes('correctamente')} en el puerto ${color.info(ENV.API.PORT)}`);
}); 