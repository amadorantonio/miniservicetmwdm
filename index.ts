import Express from 'express';
import {Request, Response} from 'express';
// Debug and Color Imports
import {DEBUG, COLOR} from './utils/debug';
// APIUtils import
import { APIUtils, apiStatusEnum } from './utils/api.utils';
// JSON Web Token
import jwt, { JsonWebTokenError } from 'jsonwebtoken'
// Acceder a las variables de entorno
import ENV from './enviroments/env.production'
// Json  web tokens middleware
import AuthToken from './middlewares/token.middleware';
//Cors
import cors from 'cors';
//SocketIO
import socketIO from 'socket.io';
import * as socket from './sockets/socket';

import http from 'http';

import multer from './utils/multer'

import { v4 as uuidv4 } from 'uuid';

import moment from 'moment';

const token = AuthToken(ENV);

//MongoDB helper import
import MongoDBHelper from './helpers/mongodb.helpers';

import path from 'path'

import { jsPDF } from "jspdf";

import { fromPath } from "pdf2pic";

const nodemailer = require("nodemailer");

var transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
        user: "antonio.amador@poderjudicial-gto.gob.mx", // generated ethereal user
        //user: "presidencia.pjegto@poderjudicial-gto.gob.mx", // generated ethereal user
        pass: "1dragon2negro342148", 
        //pass: "TIMH681223_17974",
    }
}); 

var DocxMerger = require('docx-merger');

const debug = DEBUG();
const color = COLOR();
const app = Express();

const httpServer = new http.Server(app);
const io = socketIO(httpServer); 

console.log('Escuchando conexiones - sockets');
io.on('connection', cliente => {
    console.log('Cliente conectado');

    //Desconectar
    socket.desconectar(cliente);
});


import bodyParser, { json, text } from 'body-parser'
import { ObjectId } from 'mongodb';
import { error, info } from 'console';

const apiUtils = APIUtils(ENV);
const mongodb = MongoDBHelper.getInstance(ENV);

app.use(Express.urlencoded({extended:true}))
app.use(Express.json())

//BodyParser
app.use(bodyParser.urlencoded({extended: true}));

//Cors
app.use( cors({ origin: true, credentials: true}));

app.use('/uploads', [token.verify, Express.static(path.resolve('uploads'))])
//app.use('/uploads', [Express.static(path.resolve('uploads'))])

app.post('/login', async (req: Request, res: Response, next) => {

    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");

    const { username, password } = req.body; 

    const user = await mongodb.db.collection('usuarios').findOne({ "username" : username });

    const mockRoles = ['Captura_Rol', 'Admon_Catalogos_Rol', 'Print_Rol']

    //Si el usuario existe
    if(user){
        //Valirar usuario y contraseña
        if(username == user.username && password == user.password){
            //Generar el Token para ese usuario
            const payload = {
                id: user._id,
                roles: mockRoles
            }
            jwt.sign(payload, ENV.TOKEN.SECRET_KEY, { expiresIn: ENV.TOKEN.EXPIRES }, async (err, token) => {
                //Existe el Error
                if(err){
                    return res.status(500).json(
                        apiUtils.BodyResponse(
                            apiStatusEnum.Internal_Server_Error, 
                            'Internal Server Error', 
                            'Error al intentar crear el Token',
                            null, 
                            err)
                    )
                }
                // OK
                let notificacion = { fecha: moment().utcOffset('-0600').format('DD/MM/YYYY HH:mm'), text: `${user.username} ha iniciado sesión`, username: user.username }
                const insert = await mongodb.db.collection('notificaciones').insertOne(notificacion);
                io.emit('login', insert.insertedId);
                res.status(200).json(
                    apiUtils.BodyResponse(
                        apiStatusEnum.Succes, 
                        'OK', 
                        'Token generado de forma correcta',
                        {
                            "user" : {"username" : user.username, "nombre": user.nombre},
                            token
                        }, 
                        null)
                )
            })
        }
        else{
            res.status(403).json(
                apiUtils.BodyResponse(
                    apiStatusEnum.Forbidden, 
                    'La solicitud fue legal, pero el servidor rehúsa responderla dado que el cliente no tiene los privilegios para realizarla.' + req.body.username, 
                    'Credenciales invalidas. El usuario y/o contraseña no son válidos, fabor de verificar.', 
                    {
                        
                    },
                    null
                    )
            )
        }
    }
    else{
        res.status(403).json(
            apiUtils.BodyResponse(
                apiStatusEnum.Forbidden, 
                'La solicitud fue legal, pero el servidor rehúsa responderla dado que el cliente no tiene los privilegios para realizarla.' + req.body.username, 
                'Credenciales invalidas. El usuario y/o contraseña no son válidos, fabor de verificar.', 
                {
                    
                },
                null
                )
        )
    }
})

app.get('/products', token.verify, async (req: Request, res: Response) => {

    res.header("Access-Control-Allow-Origin", "*"); //Indicar el dominio a dar acceso
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
 
    const productos = await mongodb.db.collection('cars').find({}).toArray();
    res.status(200).json(
         apiUtils.BodyResponse(
             apiStatusEnum.Succes, 'OK', 'La solicitud ha tenido exito', 
             {
                  productos,
                  authUser: req.body.authUser
             }
         )
     );
});

app.get('/bitacora', token.verify, async (req: Request, res: Response) => {

    res.header("Access-Control-Allow-Origin", "*"); //Indicar el dominio a dar acceso
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
 
    const bitacora = await mongodb.db.collection('bitacora').find({ 'activo': '1' }).sort({fecha : -1}).toArray();
    res.status(200).json(
         apiUtils.BodyResponse(
             apiStatusEnum.Succes, 'OK', 'La solicitud ha tenido exito', 
             {
                bitacora
             }
         )
     );
});

app.get('/bitacoraCharts', token.verify, async (req: Request, res: Response) => {

    res.header("Access-Control-Allow-Origin", "*"); //Indicar el dominio a dar acceso
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
 
    const bitacora = await mongodb.db.collection('bitacora').find({}).toArray();

    let meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    for(var i = 0; i < bitacora.length; i++){
        var date = new Date(bitacora[i].Fecha);
        bitacora[i].mesNumero = date.getMonth() + 1;
        bitacora[i].mesNombre = meses[date.getMonth()];
    }

    //Ordenamiento
    bitacora.sort(function(a: { mesNumero: number; }, b: { mesNumero: number; }){
        return a.mesNumero - b.mesNumero;
    });

    const key = 'mesNumero';

    const arrayUniqueByKey: any = [...new Map(bitacora.map((item: { [x: string]: any; }) =>
    [item[key], item])).values()];

    const arrayTableResult: any = [];
    const arrayLabels: any = [];
    const arrayData: any = [];
    const chartData: any = [];

    for(var i = 0; i < arrayUniqueByKey.length; i++){
        arrayTableResult.push({ mesNumero: arrayUniqueByKey[i]['mesNumero'],
                        mesNombre: arrayUniqueByKey[i]['mesNombre'],
                        conteo : bitacora.filter(function(o:any) { return o.mesNumero == arrayUniqueByKey[i]['mesNumero'] }).length
                        });
                        
        arrayLabels.push(arrayUniqueByKey[i]['mesNombre']);
        arrayData.push(bitacora.filter(function(o:any) { return o.mesNumero == arrayUniqueByKey[i]['mesNumero'] }).length);
    }

    chartData[0] = {data: arrayData, label: 'Elementos de bitácora'};

    res.status(200).json(
         apiUtils.BodyResponse(
             apiStatusEnum.Succes, 'OK', 'La solicitud ha tenido exito', 
             {
                arrayTableResult,
                arrayLabels,
                chartData,
                authUser: req.body.authUser
             }
         )
     );
});

app.post('/bitacora', token.verify, multer.array('documents'), async (req: Request, res: Response) => {

    let usuario = req.body['usuarioCreacion']
    let filesArray: any[] = []
    if(req.files){
        let data: any = req.files; 
        let files = req.files;
        let index, len;
        for (index = 0, len = files.length; index < len; ++index) {
            filesArray.push({
                'user': usuario,
                'originalname': data[index].originalname, 
                'mimetype': data[index].mimetype,
                'filename': data[index].filename,
                'path': data[index].path,
                'size': data[index].size,
                'uploadDate': new Date().toLocaleString()
            })
        }
        req.body['files'] = filesArray
    } 
    req.body['solicitudes'] = []
    req.body['quejas'] = []
    req.body['propuestasMejora'] = []
    req.body['reuniones'] = []

    await mongodb.db.collection('bitacora').insertOne(req.body);

    let notificacion = { fecha: moment().utcOffset('-0600').format('DD/MM/YYYY HH:mm'), text: `Le informamos que ${usuario} agregó un elemento de recepción de documentos.`, username: usuario }
    const insert = await mongodb.db.collection('notificaciones').insertOne(notificacion);
    io.emit('document-reception-inserted', insert.insertedId);
    res.status(200).json(
        apiUtils.BodyResponse(
            apiStatusEnum.Succes, 'OK', 'La solicitud ha tenido exito', 
            {
                 authUser: req.body.authUser
            }
        )
    );
})

app.get('/bitacora/:id', token.verify, async (req: Request, res: Response) => {
    
    const { id } = req.params;

    res.header("Access-Control-Allow-Origin", "*"); //Indicar el dominio a dar acceso
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    
    const elementoBitacora = await mongodb.db.collection('bitacora').findOne({ "_id" : new ObjectId(id) });

    res.status(200).json(
        apiUtils.BodyResponse(
            apiStatusEnum.Succes, 'OK', 'La solicitud ha tenido exito', 
            {
                elementoBitacora
            }
        )
    );
});

app.put('/bitacora', token.verify, multer.array('documents'), async (req: Request, res: Response) => {

    const id = req.body._id
    delete req.body._id
    const bitacora = req.body
    let usuario = req.body['usuarioActualizacion']
    let files = JSON.parse(req.body['files'])
    if(req.files){
        let newFiles: any = req.files;
        for (let index = 0; index < newFiles.length; ++index) {
            files.push({
                'user': usuario,
                'originalname': newFiles[index].originalname,
                'mimetype': newFiles[index].mimetype,
                'filename': newFiles[index].filename,
                'path': newFiles[index].path,
                'size': newFiles[index].size,
                'uploadDate': new Date().toLocaleString()
            })
        }
    }
    req.body['files'] = files
    const query = { "_id" : new ObjectId(id) }
    const updateDocument = { 
        $set : bitacora 
    }
    const options = {
        "multi" : false,
        "upsert" : false
    }
    const result = await mongodb.db.collection('bitacora').updateOne(query, updateDocument, options)
    let notificacion = { fecha: moment().utcOffset('-0600').format('DD/MM/YYYY HH:mm'), text: `Le informamos que ${usuario} editó un elemento de recepción de documentos.`, username: usuario }
    const insert = await mongodb.db.collection('notificaciones').insertOne(notificacion);
    //envío de comunicación a todos los clientes conectados
    io.emit('document-reception-edited', insert.insertedId);
    res.status(200).json(
        apiUtils.BodyResponse(
            apiStatusEnum.Succes, 'OK', 'La solicitud ha tenido exito', 
            {
                result
            }
        )
    );
})

app.put('/bitacora/solicitud/add', token.verify, async (req: Request, res: Response) => {

    const idDocumentReception = req.body.idDocumentReception
    delete req.body.idDocumentReception
    const solicitud = req.body
    solicitud['_id'] = uuidv4()
    let usuario = req.body['usuarioCreacion']

    const query = { "_id" : new ObjectId(idDocumentReception) }
    const updateDocument = { 
        $push: {'solicitudes': solicitud}
    }
    const options = {
        "multi" : false,
        "upsert" : false
    }
    const result = await mongodb.db.collection('bitacora').updateOne(query, updateDocument, options)
    let notificacion = { fecha: moment().utcOffset('-0600').format('DD/MM/YYYY HH:mm'), text: `Le informamos que ${usuario} agregó un elemento de solicitud de información`, username: usuario }
    const insert = await mongodb.db.collection('notificaciones').insertOne(notificacion);
    io.emit('information-request-inserted', insert.insertedId);
    res.status(200).json(
        apiUtils.BodyResponse(
            apiStatusEnum.Succes, 'OK', 'La solicitud ha tenido exito', 
            {
                result
            }
        )
    );
})

app.put('/bitacora/reunion/add', token.verify, multer.array('documents'), async (req: Request, res: Response) => {

    const idDocumentReception = req.body.idDocumentReception
    delete req.body.idDocumentReception
    const reunion = req.body
    reunion['_id'] = uuidv4()
    reunion['asistentes'] = JSON.parse(req.body['asistentes'])
    let usuario = req.body['usuarioCreacion']

    let filesArray: any[] = []
    if(req.files){
        let data: any = req.files; 
        let files = req.files;
        let index, len;
        for (index = 0, len = files.length; index < len; ++index) {
            filesArray.push({
                'user': usuario,
                'originalname': data[index].originalname, 
                'mimetype': data[index].mimetype,
                'filename': data[index].filename,
                'path': data[index].path,
                'size': data[index].size,
                'uploadDate': new Date().toLocaleString()
            })
        }
        req.body['files'] = filesArray
    } 

    const query = { "_id" : new ObjectId(idDocumentReception) }
    const updateDocument = { 
        $push: {'reuniones': reunion}
    }
    const options = {
        "multi" : false,
        "upsert" : false
    }
    const result = await mongodb.db.collection('bitacora').updateOne(query, updateDocument, options)
    let notificacion = { fecha: moment().utcOffset('-0600').format('DD/MM/YYYY HH:mm'), text: `Le informamos que ${usuario} agregó una reunión`, username: usuario }
    const insert = await mongodb.db.collection('notificaciones').insertOne(notificacion);
    io.emit('meeting-inserted', insert.insertedId);
    res.status(200).json(
        apiUtils.BodyResponse(
            apiStatusEnum.Succes, 'OK', 'La solicitud ha tenido exito', 
            {
                result
            }
        )
    );
})

app.put('/bitacora/queja/add', token.verify, async (req: Request, res: Response) => {

    const idDocumentReception = req.body.idDocumentReception
    delete req.body.idDocumentReception
    const queja = req.body
    queja['_id'] = uuidv4()
    let usuario = req.body['usuarioCreacion']
    const query = { "_id" : new ObjectId(idDocumentReception) }
    const updateDocument = { 
        $push: {'quejas': queja}
    }
    const options = {
        "multi" : false,
        "upsert" : false
    }
    const result = await mongodb.db.collection('bitacora').updateOne(query, updateDocument, options)
    let notificacion = { fecha: moment().utcOffset('-0600').format('DD/MM/YYYY HH:mm'), text: `Le informamos que ${usuario} agregó una reunión`, username: usuario }
    const insert = await mongodb.db.collection('notificaciones').insertOne(notificacion);
    io.emit('complain-inserted', insert.insertedId);
    res.status(200).json(
        apiUtils.BodyResponse(
            apiStatusEnum.Succes, 'OK', 'La solicitud ha tenido exito', 
            {
                result
            }
        )
    );
})

app.put('/bitacora/propuestasMejora/add', token.verify, async (req: Request, res: Response) => {

    const idDocumentReception = req.body.idDocumentReception
    delete req.body.idDocumentReception
    const improvement = req.body
    improvement['_id'] = uuidv4()
    let usuario = req.body['usuarioCreacion']
    const query = { "_id" : new ObjectId(idDocumentReception) }
    const updateDocument = { 
        $push: {'propuestasMejora': improvement}
    }
    const options = {
        "multi" : false,
        "upsert" : false
    }
    const result = await mongodb.db.collection('bitacora').updateOne(query, updateDocument, options)
    let notificacion = { fecha: moment().utcOffset('-0600').format('DD/MM/YYYY HH:mm'), text: `Le informamos que ${usuario} agregó una propuesta de mejora`, username: usuario }
    const insert = await mongodb.db.collection('notificaciones').insertOne(notificacion);
    io.emit('improvement-inserted', insert.insertedId);
    res.status(200).json(
        apiUtils.BodyResponse(
            apiStatusEnum.Succes, 'OK', 'La solicitud ha tenido exito', 
            {
                result
            }
        )
    );
})

app.put('/bitacora/solicitud/edit', token.verify, async (req: Request, res: Response) => {

    const idDocumentReception = req.body.idDocumentReception
    const _id = req.body._id
    delete req.body.idDocumentReception
    const informationRequest = req.body
    let usuario = req.body['usuarioActualizacion']

    const query = { "_id" : new ObjectId(idDocumentReception), "solicitudes._id": _id }
    const updateDocument = { 
        $set : { "solicitudes.$":  informationRequest}
    }
    const options = {
        "multi" : false,
        "upsert" : false
    }
    const result = await mongodb.db.collection('bitacora').updateOne(query, updateDocument, options)
    let notificacion = { fecha: moment().utcOffset('-0600').format('DD/MM/YYYY HH:mm'), text: `Le informamos que ${usuario} editó un elemento de solicitud de información`, username: usuario }
    const insert = await mongodb.db.collection('notificaciones').insertOne(notificacion);
    io.emit('information-request-edited', insert.insertedId);
    res.status(200).json(
        apiUtils.BodyResponse(
            apiStatusEnum.Succes, 'OK', 'La solicitud ha tenido exito', 
            {
                result
            }
        )
    );
})

app.put('/bitacora/reunion/edit', token.verify, multer.array('documents'), async (req: Request, res: Response) => {

    const idDocumentReception = req.body.idDocumentReception
    const _id = req.body._id
    delete req.body.idDocumentReception
    const reunion = req.body
    reunion['asistentes'] = JSON.parse(req.body['asistentes'])
    let files = JSON.parse(req.body['files'])
    let usuario = req.body['usuarioActualizacion']

    if(req.files){
        let newFiles: any = req.files;
        for (let index = 0; index < newFiles.length; ++index) {
            files.push({
                'user': usuario,
                'originalname': newFiles[index].originalname, 
                'mimetype': newFiles[index].mimetype,
                'filename': newFiles[index].filename,
                'path': newFiles[index].path,
                'size': newFiles[index].size,
                'uploadDate': new Date().toLocaleString()
            })
        }
    } 

    req.body['files'] = files
    const query = { "_id" : new ObjectId(idDocumentReception), "reuniones._id": _id }
    const updateDocument = { 
        $set: {'reuniones.$': reunion}
    }
    const options = {
        "multi" : false,
        "upsert" : false
    }
    const result = await mongodb.db.collection('bitacora').updateOne(query, updateDocument, options)
    let notificacion = { fecha: moment().utcOffset('-0600').format('DD/MM/YYYY HH:mm'), text: `Le informamos que ${usuario} editó una reunión`, username: usuario }
    const insert = await mongodb.db.collection('notificaciones').insertOne(notificacion);
    io.emit('meeting-edited', insert.insertedId);
    res.status(200).json(
        apiUtils.BodyResponse(
            apiStatusEnum.Succes, 'OK', 'La solicitud ha tenido exito', 
            {
                result
            }
        )
    );
})

app.put('/bitacora/queja/edit', token.verify, multer.array('documents'), async (req: Request, res: Response) => {

    const idDocumentReception = req.body.idDocumentReception
    const _id = req.body._id
    delete req.body.idDocumentReception
    const queja = req.body
    let usuario = req.body['usuarioActualizacion']

    const query = { "_id" : new ObjectId(idDocumentReception), "quejas._id": _id }
    const updateDocument = { 
        $set: {'quejas.$': queja}
    }
    const options = {
        "multi" : false,
        "upsert" : false
    }
    const result = await mongodb.db.collection('bitacora').updateOne(query, updateDocument, options)
    let notificacion = { fecha: moment().utcOffset('-0600').format('DD/MM/YYYY HH:mm'), text: `Le informamos que ${usuario} editó una reunión`, username: usuario }
    const insert = await mongodb.db.collection('notificaciones').insertOne(notificacion);
    io.emit('complain-edited', insert.insertedId);
    res.status(200).json(
        apiUtils.BodyResponse(
            apiStatusEnum.Succes, 'OK', 'La solicitud ha tenido exito', 
            {
                result
            }
        )
    );
})

app.put('/bitacora/propuestasMejora/edit', token.verify, multer.array('documents'), async (req: Request, res: Response) => {

    const idDocumentReception = req.body.idDocumentReception
    const _id = req.body._id
    delete req.body.idDocumentReception
    const improvement = req.body
    let usuario = req.body['usuarioActualizacion']

    const query = { "_id" : new ObjectId(idDocumentReception), "propuestasMejora._id": _id }
    const updateDocument = { 
        $set: {'propuestasMejora.$': improvement}
    }
    const options = {
        "multi" : false,
        "upsert" : false
    }
    const result = await mongodb.db.collection('bitacora').updateOne(query, updateDocument, options)
    let notificacion = { fecha: moment().utcOffset('-0600').format('DD/MM/YYYY HH:mm'), text: `Le informamos que ${usuario} editó una propuesta de mejora`, username: usuario }
    const insert = await mongodb.db.collection('notificaciones').insertOne(notificacion);
    io.emit('improvement-edited', insert.insertedId);
    res.status(200).json(
        apiUtils.BodyResponse(
            apiStatusEnum.Succes, 'OK', 'La solicitud ha tenido exito', 
            {
                result
            }
        )
    );
})

app.get('/bitacora/solicitud/:idDocumentReception/:idInformationRequest', token.verify, async (req: Request, res: Response) => {
    
    const { idDocumentReception, idInformationRequest } = req.params;
    res.header("Access-Control-Allow-Origin", "*"); //Indicar el dominio a dar acceso
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    const dicumentReception = await mongodb.db.collection('bitacora').findOne({ "_id" : new ObjectId(idDocumentReception), "solicitudes._id": idInformationRequest });
    const informationRequest = dicumentReception['solicitudes'].find((x: { _id: string; }) => x._id === idInformationRequest)

    res.status(200).json(
        apiUtils.BodyResponse(
            apiStatusEnum.Succes, 'OK', 'La solicitud ha tenido exito', 
            {
                informationRequest
            } 
        )
    );
});

app.get('/bitacora/reunion/:idDocumentReception/:idMeeting', token.verify, async (req: Request, res: Response) => {
    
    const { idDocumentReception, idMeeting } = req.params;
    res.header("Access-Control-Allow-Origin", "*"); //Indicar el dominio a dar acceso
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    const dicumentReception = await mongodb.db.collection('bitacora').findOne({ "_id" : new ObjectId(idDocumentReception), "reuniones._id": idMeeting });
    const meeting = dicumentReception['reuniones'].find((x: { _id: string; }) => x._id === idMeeting)

    res.status(200).json(
        apiUtils.BodyResponse(
            apiStatusEnum.Succes, 'OK', 'La solicitud ha tenido exito', 
            {
                meeting
            } 
        )
    );
});

app.get('/bitacora/queja/:idDocumentReception/:idComplain', token.verify, async (req: Request, res: Response) => {
    
    const { idDocumentReception, idComplain } = req.params;
    res.header("Access-Control-Allow-Origin", "*"); //Indicar el dominio a dar acceso
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    const dicumentReception = await mongodb.db.collection('bitacora').findOne({ "_id" : new ObjectId(idDocumentReception), "quejas._id": idComplain });
    const complain = dicumentReception['quejas'].find((x: { _id: string; }) => x._id === idComplain)

    res.status(200).json(
        apiUtils.BodyResponse(
            apiStatusEnum.Succes, 'OK', 'La solicitud ha tenido exito', 
            {
                complain
            } 
        )
    );
});

app.get('/bitacora/propuestasMejora/:idDocumentReception/:idImprovement', token.verify, async (req: Request, res: Response) => {
    
    const { idDocumentReception, idImprovement } = req.params;
    res.header("Access-Control-Allow-Origin", "*"); //Indicar el dominio a dar acceso
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    const dicumentReception = await mongodb.db.collection('bitacora').findOne({ "_id" : new ObjectId(idDocumentReception), "propuestasMejora._id": idImprovement });
    const improvement = dicumentReception['propuestasMejora'].find((x: { _id: string; }) => x._id === idImprovement)

    res.status(200).json(
        apiUtils.BodyResponse(
            apiStatusEnum.Succes, 'OK', 'La solicitud ha tenido exito', 
            {
                improvement
            } 
        )
    );
});

app.put('/bitacora/delete', token.verify, async (req: Request, res: Response) => {

    const idElementoBitacora = req.body.idElementoBitacora
    const idUsuario = req.body.idUsuario

    await mongodb.db.collection('bitacora').update({
        "_id" : new ObjectId(idElementoBitacora)
    },
    
    // update 
    {$set: {'activo': '0', 'fechaActualizacion': new Date().toLocaleString(), 'usuarioActualizacion': idUsuario}},
    
    // options 
    {
        "multi" : false,  // update only one document 
        "upsert" : false  // insert a new document, if no existing document match the query 
    });

    //envío de comunicación a todos los clientes conectados
    // io.emit('edicion-elemento-bitacora', 'Le informamos que se editó un elemento de bitácora');

    res.status(200).json(
        apiUtils.BodyResponse(
            apiStatusEnum.Succes, 'OK', 'La solicitud ha tenido exito', 
            {
                idElementoBitacora
            }
        )
    );
})

app.get('/bitacora/busqueda/:fechaI/:fechaF/:usuariosAlta', token.verify, async (req: Request, res: Response) => {

    const { fechaI, fechaF, usuariosAlta } = req.params;

    const usuariosAltaArray = usuariosAlta.split(',')

    res.header("Access-Control-Allow-Origin", "*"); //Indicar el dominio a dar acceso
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    
    const elementosBitacora = await mongodb.db.collection('bitacora').find({ 'fecha': { $gte: fechaI, $lt: fechaF }, 'usuarioCreacion': { $in: usuariosAltaArray }, 'activo': '1' }).sort({"fecha" : -1}).toArray();

    res.status(200).json(
        apiUtils.BodyResponse(
            apiStatusEnum.Succes, 'OK', 'La solicitud ha tenido exito', 
            {
                elementosBitacora
            }
        )
    );
});

app.get('/solicitudinformacion', token.verify, async (req: Request, res: Response) => {

    res.header("Access-Control-Allow-Origin", "*"); //Indicar el dominio a dar acceso
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
 
    const solicitudesInformacion = await mongodb.db.collection('solicitudes-informacion').find({'activo': '1'}).sort({"fechaRecepcion" : -1}).toArray();
    res.status(200).json(
         apiUtils.BodyResponse(
             apiStatusEnum.Succes, 'OK', 'La solicitud ha tenido exito', 
             {
                solicitudesInformacion,
                authUser: req.body.authUser
             }
         )
     );
});

app.post('/solicitudinformacion', token.verify, multer.array('documents'), async (req: Request, res: Response) => {

    
    let body = req.body
    let usuario = req.body['usuarioCreacion']
    let filesArray: any[] = []
    let seguimiento = JSON.parse(req.body['seguimiento'])
    if(req.files){
        let data: any = req.files; 
        let files = req.files;
        let index, len;
        for (index = 0, len = files.length; index < len; ++index) {
            filesArray.push({
                'originalname': data[index].originalname, 
                'mimetype': data[index].mimetype,
                'filename': data[index].filename,
                'path': data[index].path,
                'size': data[index].size,
                'uploadDate': new Date().toLocaleString()
            })
        }
        req.body['files'] = filesArray
    } 
    body['seguimiento'] = seguimiento

    await mongodb.db.collection('solicitudes-informacion').insertOne(req.body, async function (err:any,result:any) {

        //envío de comunicación a todos los clientes conectados
        let notificacion = { fecha: moment().utcOffset('-0600').format('DD/MM/YYYY HH:mm'), text: `Le informamos que ${usuario} agregó un nuevo elemento de solicitud de información`, username: usuario }
        const insert = await mongodb.db.collection('notificaciones').insertOne(notificacion);
        io.emit('alta-solicitud-informacion', insert.insertedId);

        res.status(200).json(
            apiUtils.BodyResponse(
                apiStatusEnum.Succes, 'OK', 'La solicitud ha tenido exito', 
                {
                    body,
                    authUser: req.body.authUser
                }
            )
        ); 
    });
})

app.put('/solicitudinformacion', token.verify, multer.array('documents'), async (req: Request, res: Response) => {

    const id = req.body._id
    delete req.body._id
    const solicitud = req.body
    let files = JSON.parse(req.body['files'])
    let seguimiento = JSON.parse(req.body['seguimiento'])

    if(req.files){
        let newFiles: any = req.files;
        for (let index = 0; index < newFiles.length; ++index) {
            files.push({
                'originalname': newFiles[index].originalname,
                'mimetype': newFiles[index].mimetype,
                'filename': newFiles[index].filename,
                'path': newFiles[index].path,
                'size': newFiles[index].size,
                'uploadDate': new Date().toLocaleString()
            })
        }
    }

    req.body['files'] = files
    req.body['seguimiento'] = seguimiento

    const query = { "_id" : new ObjectId(id) }
    const updateDocument = { 
        $set : solicitud 
    }
    const options = {
        "multi" : false,
        "upsert" : false
    }
    const result = await mongodb.db.collection('solicitudes-informacion').updateOne(query, updateDocument, options)


    // await mongodb.db.collection('solicitudes-informacion').update({
    //     "_id" : new ObjectId(id)
    // },
    
    // // update 
    // solicitud,
    
    // // options 
    // {
    //     "multi" : false,  // update only one document 
    //     "upsert" : false  // insert a new document, if no existing document match the query 
    // });

    //envío de comunicación a todos los clientes conectados
    // io.emit('alta-solicitud-informacion', 'Le informamos que se agregó un nuevo elemento de solicitud de información');

    res.status(200).json(
        apiUtils.BodyResponse(
            apiStatusEnum.Succes, 'OK', 'La solicitud ha tenido exito', 
            {
                solicitud
            }
        )
    );
})

app.put('/solicitudinformacion/fileDelete', token.verify, async (req: Request, res: Response) => {

    const idSolicitud = req.body.idSolicitud
    const fileName = req.body.fileName

    await mongodb.db.collection('solicitudes-informacion').update({
        "_id" : new ObjectId(idSolicitud)
    },
    
    // update 
    {$pull: {'files': { 'filename': fileName }}},
    
    // options 
    {
        "multi" : false,  // update only one document 
        "upsert" : false  // insert a new document, if no existing document match the query 
    }); 

    res.status(200).json(
        apiUtils.BodyResponse(
            apiStatusEnum.Succes, 'OK', 'La solicitud ha tenido exito', 
            {
                idSolicitud,
                authUser: req.body.authUser
            }
        )
    );
})

app.put('/solicitudinformacion/delete', token.verify, async (req: Request, res: Response) => {

    const idSolicitud = req.body.idSolicitud
    const idUsuario = req.body.idUsuario

    await mongodb.db.collection('solicitudes-informacion').updateOne({
        "_id" : new ObjectId(idSolicitud)
    },
    
    // update 
    {$set: {'activo': '0', 'fechaActualizacion': new Date().toLocaleString(), 'usuarioActualizacion': idUsuario}},
    
    // options 
    {
        "multi" : false,  // update only one document 
        "upsert" : false  // insert a new document, if no existing document match the query 
    }); 

    res.status(200).json(
        apiUtils.BodyResponse(
            apiStatusEnum.Succes, 'OK', 'La solicitud ha tenido exito', 
            {
                idSolicitud,
                authUser: req.body.authUser
            }
        )
    );
})

app.get('/solicitudinformacion/:id', token.verify, async (req: Request, res: Response) => {

    const { id } = req.params;

    res.header("Access-Control-Allow-Origin", "*"); //Indicar el dominio a dar acceso
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    
    const solicitud = await mongodb.db.collection('solicitudes-informacion').findOne({ "_id" : new ObjectId(id) });

    res.status(200).json(
        apiUtils.BodyResponse(
            apiStatusEnum.Succes, 'OK', 'La solicitud ha tenido exito', 
            {
                solicitud,
                authUser: req.body.authUser
            }
        )
    );
});

app.get('/solicitudinformacion/:fechaI/:fechaF/:estatus/:tipoSolicitante', token.verify, async (req: Request, res: Response) => {

    const { fechaI, fechaF, estatus, tipoSolicitante } = req.params;

    const tipoSolicitanteArray = tipoSolicitante.split(',')
    const estatusArray = estatus.split(',')

    res.header("Access-Control-Allow-Origin", "*"); //Indicar el dominio a dar acceso
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    
    const solicitudes = await mongodb.db.collection('solicitudes-informacion').find({ 'fechaLimite': { $gte: fechaI, $lt: fechaF }, 'estatus': { $in: estatusArray }, 'tipoSolicitante': { $in: tipoSolicitanteArray } }).sort({"fechaRecepcion" : -1}).toArray();

    res.status(200).json(
        apiUtils.BodyResponse(
            apiStatusEnum.Succes, 'OK', 'La solicitud ha tenido exito', 
            {
                solicitudes,
                authUser: req.body.authUser
            }
        )
    );
});

app.post('/products', async (req: Request, res: Response) => {
    await mongodb.db.collection('cars').insertOne(req.body);
    res.status(200).json(
        apiUtils.BodyResponse(
            apiStatusEnum.Succes, 'OK', 'La solicitud ha tenido exito', 
            {
                 //req.body,
                 authUser: req.body.authUser
            }
        )
    );
})

app.get('/products/categoria/:categoria', async (req: Request, res: Response) => {
 
    const { categoria } = req.params;

    res.header("Access-Control-Allow-Origin", "*"); //Indicar el dominio a dar acceso
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    
    //const productos = await mongodb.db.collection('cars').find({'categoria': {'$regex': categoria, '$options': 'i'}}).toArray();

    res.status(200).json(
        apiUtils.BodyResponse(
            apiStatusEnum.Succes, 'OK', 'La solicitud ha tenido exito', 
            {
                //productos,
                authUser: req.body.authUser
            }
        )
    );
});

app.get('/products/:code', async (req: Request, res: Response) => {

    const { code } = req.params;

    res.header("Access-Control-Allow-Origin", "*"); //Indicar el dominio a dar acceso
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    
    //const productos = await mongodb.db.collection('cars').findOne({ 'codigo': code});

    res.status(200).json(
        apiUtils.BodyResponse(
            apiStatusEnum.Succes, 'OK', 'La solicitud ha tenido exito', 
            {
                //productos,
                authUser: req.body.authUser
            }
        )
    );
});

app.get('/products/buscar/:criterio', async (req: Request, res: Response) => {

    const { criterio } = req.params;

    res.header("Access-Control-Allow-Origin", "*"); //Indicar el dominio a dar acceso
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    
    //const productos = await mongodb.db.collection('cars').find({'descripcion': {'$regex': criterio, '$options': 'i'}}).toArray();

    res.status(200).json(
        apiUtils.BodyResponse(
            apiStatusEnum.Succes, 'OK', 'La solicitud ha tenido exito', 
            {
                //productos,
                authUser: req.body.authUser
            }
        )
    );
});

app.post('/reunion', token.verify, multer.array('documents'), async (req: Request, res: Response) => { 

    const reunion = req.body
    reunion['asistentes'] = JSON.parse(req.body['asistentes'])
    let usuario = req.body['usuarioCreacion']
    let filesArray: any[] = []
    if(req.files){
        let data: any = req.files; 
        let files = req.files;
        let index, len;
        for (index = 0, len = files.length; index < len; ++index) {
            filesArray.push({
                'user': usuario,
                'originalname': data[index].originalname, 
                'mimetype': data[index].mimetype,
                'filename': data[index].filename,
                'path': data[index].path,
                'size': data[index].size,
                'uploadDate': new Date().toLocaleString()
            })
        }
        req.body['files'] = filesArray
    } 
    const result = await mongodb.db.collection('reuniones').insertOne(reunion);
    let notificacion = { fecha: moment().utcOffset('-0600').format('DD/MM/YYYY HH:mm'), text: `Le informamos que ${usuario} agregó una reunión`, username: usuario }
    const insert = await mongodb.db.collection('notificaciones').insertOne(notificacion);
    io.emit('meeting-inserted', insert.insertedId);
    res.status(200).json(
        apiUtils.BodyResponse(
            apiStatusEnum.Succes, 'OK', 'La solicitud ha tenido exito', 
            {
                result
            }
        )
    );
})

app.get('/reunion', token.verify, async (req: Request, res: Response) => {
    
    const reuniones = await mongodb.db.collection('reuniones').find({"activo":"1"}).sort({"fecha" : -1}).toArray();

    res.status(200).json(
        apiUtils.BodyResponse(
            apiStatusEnum.Succes, 'OK', 'La solicitud ha tenido exito', 
            {
                reuniones
            }
        )
    );
});

app.get('/reunion/:id', token.verify, async (req: Request, res: Response) => {
    
    const { id } = req.params;

    res.header("Access-Control-Allow-Origin", "*"); //Indicar el dominio a dar acceso
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    
    const reunion = await mongodb.db.collection('reuniones').findOne({ "_id" : new ObjectId(id) });

    res.status(200).json(
        apiUtils.BodyResponse(
            apiStatusEnum.Succes, 'OK', 'La solicitud ha tenido exito', 
            {
                reunion
            }
        )
    );
});

app.put('/reunion', token.verify, multer.array('documents'), async (req: Request, res: Response) => {

    const id = req.body._id
    delete req.body._id
    const reunion = req.body
    reunion['asistentes'] = JSON.parse(req.body['asistentes'])
    let files = JSON.parse(req.body['files'])
    let usuario = req.body['usuarioActualizacion']

    if(req.files){
        let newFiles: any = req.files;
        for (let index = 0; index < newFiles.length; ++index) {
            files.push({
                'user': usuario,
                'originalname': newFiles[index].originalname,
                'mimetype': newFiles[index].mimetype,
                'filename': newFiles[index].filename,
                'path': newFiles[index].path,
                'size': newFiles[index].size,
                'uploadDate': new Date().toLocaleString()
            })
        }
    }
    req.body['files'] = files

    const query = { "_id" : new ObjectId(id) }
    const updateDocument = { 
        $set : reunion 
    }
    const options = {
        "multi" : false,
        "upsert" : false
    }
    const result = await mongodb.db.collection('reuniones').updateOne(query, updateDocument, options)

    let notificacion = { fecha: moment().utcOffset('-0600').format('DD/MM/YYYY HH:mm'), text: `Le informamos que ${usuario} editó una reunión`, username: usuario }
    const insert = await mongodb.db.collection('notificaciones').insertOne(notificacion);
    io.emit('meeting-edited', insert.insertedId);

    res.status(200).json(
        apiUtils.BodyResponse(
            apiStatusEnum.Succes, 'OK', 'La solicitud ha tenido exito', 
            {
                result
            }
        )
    );
})

app.put('/reunion/fileDelete', token.verify, async (req: Request, res: Response) => {

    const idReunion = req.body.idReunion
    const fileName = req.body.fileName

    await mongodb.db.collection('reuniones').update({
        "_id" : new ObjectId(idReunion)
    },
    
    // update 
    {$pull: {'files': { 'filename': fileName }}},
    
    // options 
    {
        "multi" : false,  // update only one document 
        "upsert" : false  // insert a new document, if no existing document match the query 
    }); 

    res.status(200).json(
        apiUtils.BodyResponse(
            apiStatusEnum.Succes, 'OK', 'La solicitud ha tenido exito', 
            {
                idReunion
            }
        )
    );
})

app.put('/reunion/delete', token.verify, async (req: Request, res: Response) => {

    const idReunion = req.body.idReunion
    const idUsuario = req.body.idUsuario

    await mongodb.db.collection('reuniones').updateOne({
        "_id" : new ObjectId(idReunion)
    },
    
    // update 
    {$set: {'activo': '0', 'fechaActualizacion': new Date().toLocaleString(), 'usuarioActualizacion': idUsuario}},
    
    // options 
    {
        "multi" : false,  // update only one document 
        "upsert" : false  // insert a new document, if no existing document match the query 
    }); 

    let notificacion = { fecha: moment().utcOffset('-0600').format('DD/MM/YYYY HH:mm'), text: `Le informamos que ${idUsuario} eliminó una reunión`, username: idUsuario }
    const insert = await mongodb.db.collection('notificaciones').insertOne(notificacion);
    io.emit('delete-reunion', insert.insertedId);

    res.status(200).json(
        apiUtils.BodyResponse(
            apiStatusEnum.Succes, 'OK', 'La solicitud ha tenido exito', 
            {
                idReunion
            }
        )
    );
})

app.get('/areas', token.verify, async (req: Request, res: Response) => {
    
    const areas = await mongodb.db.collection('areas').find({}).sort({"nombre" : 1}).toArray();

    res.status(200).json(
        apiUtils.BodyResponse(
            apiStatusEnum.Succes, 'OK', 'La solicitud ha tenido exito', 
            {
                areas
            }
        )
    );
});

app.get('/areas/:id', token.verify, async (req: Request, res: Response) => {
    
    const { id } = req.params;

    res.header("Access-Control-Allow-Origin", "*"); //Indicar el dominio a dar acceso
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    
    const area = await mongodb.db.collection('areas').findOne({ "_id" : new ObjectId(id) });

    res.status(200).json(
        apiUtils.BodyResponse(
            apiStatusEnum.Succes, 'OK', 'La solicitud ha tenido exito', 
            {
                area
            }
        )
    );
});

app.put('/areas/solicitud/add', token.verify, multer.array('documents'), async (req: Request, res: Response) => {

    const idArea = req.body.idArea
    delete req.body.idArea
    const solicitud = req.body
    solicitud['_id'] = uuidv4()

    let filesArray: any[] = []
    if(req.files){
        let data: any = req.files; 
        let files = req.files;
        let index, len;
        for (index = 0, len = files.length; index < len; ++index) {
            filesArray.push({
                'originalname': data[index].originalname, 
                'mimetype': data[index].mimetype,
                'filename': data[index].filename,
                'path': data[index].path,
                'size': data[index].size,
                'uploadDate': new Date().toLocaleString()
            })
        }
        solicitud['files'] = filesArray
    }

    await mongodb.db.collection('areas').updateOne({
        "_id" : new ObjectId(idArea)
    },
    
    // update 
    {$push: {'solicitudes': solicitud}},
    
    // options 
    {
        "multi" : false,  // update only one document 
        "upsert" : false  // insert a new document, if no existing document match the query 
    }); 

    res.status(200).json(
        apiUtils.BodyResponse(
            apiStatusEnum.Succes, 'OK', 'La solicitud ha tenido exito', 
            {
                idArea
            }
        )
    );
})

app.get('/areas/solicitud/:idArea/:idSolicitud', token.verify, async (req: Request, res: Response) => {
    
    const { idArea, idSolicitud } = req.params;

    res.header("Access-Control-Allow-Origin", "*"); //Indicar el dominio a dar acceso
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");

    
    const area = await mongodb.db.collection('areas').findOne({ "_id" : new ObjectId(idArea), "solicitudes._id": idSolicitud });

    const solicitud = area['solicitudes'].find((x: { _id: string; }) => x._id === idSolicitud)

    res.status(200).json(
        apiUtils.BodyResponse(
            apiStatusEnum.Succes, 'OK', 'La solicitud ha tenido exito', 
            {
                solicitud
            } 
        )
    );
});

app.put('/areas/solicitud/edit', token.verify, multer.array('documents'), async (req: Request, res: Response) => {

    const idArea = req.body.idArea
    const _id = req.body._id
    delete req.body.idArea
    const solicitud = req.body
    let files = JSON.parse(req.body['files'])

    if(req.files){
        let newFiles: any = req.files;
        for (let index = 0; index < newFiles.length; ++index) {
            files.push({
                'originalname': newFiles[index].originalname,
                'mimetype': newFiles[index].mimetype,
                'filename': newFiles[index].filename,
                'path': newFiles[index].path,
                'size': newFiles[index].size,
                'uploadDate': new Date().toLocaleString()
            })
        }
    }

    req.body['files'] = files

    const query = { "_id" : new ObjectId(idArea), "solicitudes._id": _id }

    const updateDocument = { 
        $set : { "solicitudes.$":  solicitud}
    }
 
    const options = {
        "multi" : false,
        "upsert" : false
    }

    const result = await mongodb.db.collection('areas').updateOne(query, updateDocument, options)

    res.status(200).json(
        apiUtils.BodyResponse(
            apiStatusEnum.Succes, 'OK', 'La solicitud ha tenido exito', 
            {
                idArea
            }
        )
    );
})

app.get('/notificaciones', token.verify, async (req: Request, res: Response) => {
    
    // const areas = await mongodb.db.collection('areas').find({}).sort({"nombre" : 1}).toArray();

    // const areas = await mongodb.db.collection('areas').find({}).sort({"nombre" : 1}).toArray()
    // let solicitudesAreas: any[] = [] 
    // areas.map((area: any) => {

    //     area['solicitudes'].map((solicitud: any) => {

    //         if(solicitud['estatus'] === 'Pendiente'){
    //             let fechaLimite = moment(solicitud['fechaLimite'])
    //             let diferenciaFechas = `${fechaLimite.diff(new Date, 'days')} días`
    //             let numDiferenciaFechas = fechaLimite.diff(new Date, 'days')

    //             return {
    //                 tipo: 'Solicitud a área para informe',
    //                 fecha: fechaLimite.format('DD/MM/YYYY HH:mm'),
    //                 diferenciaFechas: diferenciaFechas,
    //                 numDiferenciaFechas: numDiferenciaFechas,
    //                 texto: `${solicitud['nombre']} - ${area['nombre']}`
    //             }
    //         }
    //     }).forEach((area: any) => {
    //         if(area){
    //             solicitudesAreas.push(area)
    //         }
    //     })
    // })

    // const solicitudesInformacion = await mongodb.db.collection('solicitudes-informacion').find({'activo': '1'}).sort({"fechaRecepcion" : -1}).toArray();
    // let solicitudesTermino: any[] = []
    // solicitudesInformacion.map((solicitud: any) => {
    //     if(solicitud['estatus'] === 'Pendiente'){
    //         let fechaLimite = moment(solicitud['fechaLimite'])
    //         let diferenciaFechas = `${fechaLimite.diff(new Date, 'days')} días`
    //         let numDiferenciaFechas = fechaLimite.diff(new Date, 'days')

    //         return{
    //             tipo: 'Solicitud de información',
    //             fecha: fechaLimite.format('DD/MM/YYYY HH:mm'),
    //             diferenciaFechas: diferenciaFechas,
    //             numDiferenciaFechas: numDiferenciaFechas,
    //             texto: `${solicitud['solicitud']} - ${solicitud['solicitante']}`
    //         }
    //     }
    // }).forEach((solicitud: any) => {
    //     if(solicitud){
    //         solicitudesTermino.push(solicitud)
    //     }
    // })
    //let notificaciones = solicitudesAreas.concat(solicitudesTermino)

    const documentsReception = await mongodb.db.collection('bitacora').find({'activo': '1'}).toArray();
    const listRequestInformation: any[] = []
    documentsReception.map((reception: any) => {
        if(reception.solicitudes){
            reception.solicitudes.map((solicitud: any) => { 
                if(solicitud['estatus'] === 'Pendiente'){
                    let fechaLimite = moment(solicitud['fechaLimite'])
                    let diferenciaFechas = `${fechaLimite.diff(new Date, 'days')} días`
                    let numDiferenciaFechas = fechaLimite.diff(new Date, 'days')
                    listRequestInformation.push(
                        {
                            tipo: 'Solicitud de información',
                            fecha: fechaLimite.format('DD/MM/YYYY HH:mm'),
                            diferenciaFechas: diferenciaFechas,
                            numDiferenciaFechas: numDiferenciaFechas,
                            texto: `${solicitud['solicitud']} - ${reception['nombre']}`
                        }
                    )
                }
            })
        }
    })
    let notificaciones = listRequestInformation

    res.status(200).json(
        apiUtils.BodyResponse(
            apiStatusEnum.Succes, 'OK', 'La solicitud ha tenido exito', 
            {
                notificaciones
            }
        )
    );
});

app.get('/notificaciones/:idNotificacion', token.verify, async (req: Request, res: Response) => {
    
    const { idNotificacion } = req.params;

    res.header("Access-Control-Allow-Origin", "*"); //Indicar el dominio a dar acceso
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");

    
    const notificacion = await mongodb.db.collection('notificaciones').findOne({ "_id" : new ObjectId(idNotificacion) });

    res.status(200).json(
        apiUtils.BodyResponse(
            apiStatusEnum.Succes, 'OK', 'La solicitud ha tenido exito', 
            {
                notificacion
            } 
        )
    );
});

app.get('/pendientesinforme', token.verify, async (req: Request, res: Response) => {
    
    const pendientesinforme = await mongodb.db.collection('pendientes-informe').find({}).sort({"fechaLimite" : 1, "nombre": 1}).toArray();

    res.status(200).json(
        apiUtils.BodyResponse(
            apiStatusEnum.Succes, 'OK', 'La solicitud ha tenido exito', 
            {
                pendientesinforme
            }
        )
    );
});

app.post('/pendientesinforme/add', token.verify, async (req: Request, res: Response) => { 
    delete req.body._id
    await mongodb.db.collection('pendientes-informe').insertOne(req.body, async function (err:any,result:any){
        res.status(200).json(
            apiUtils.BodyResponse(
                apiStatusEnum.Succes, 'OK', 'La solicitud ha tenido exito', 
                {
                     result
                }
            )
        ); 
    });
})

app.get('/pendientesinforme/:id', token.verify, async (req: Request, res: Response) => {
    
    const { id } = req.params;

    res.header("Access-Control-Allow-Origin", "*"); //Indicar el dominio a dar acceso
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    
    const pendienteinforme = await mongodb.db.collection('pendientes-informe').findOne({ "_id" : new ObjectId(id) });

    res.status(200).json(
        apiUtils.BodyResponse(
            apiStatusEnum.Succes, 'OK', 'La solicitud ha tenido exito', 
            {
                pendienteinforme
            }
        )
    );
});

app.put('/pendientesinforme/edit', token.verify, multer.array('documents'), async (req: Request, res: Response) => {

    const _id = req.body._id
    delete req.body._id
    const pendiente = req.body

    const query = { "_id" : new ObjectId(_id) }

    const updateDocument = { 
        $set : pendiente 
    }
 
    const options = {
        "multi" : false,
        "upsert" : false
    }

    const result = await mongodb.db.collection('pendientes-informe').updateOne(query, updateDocument, options)

    res.status(200).json(
        apiUtils.BodyResponse(
            apiStatusEnum.Succes, 'OK', 'La solicitud ha tenido exito', 
            {
                result
            }
        )
    );
})

app.get('/contactos', token.verify, async (req: Request, res: Response) => {
    
    const contactos = await mongodb.db.collection('contactos').find({ 'activo': '1' }).sort({"grupo" : 1, "nombre" : 1}).toArray();

    res.status(200).json(
        apiUtils.BodyResponse(
            apiStatusEnum.Succes, 'OK', 'La solicitud ha tenido exito', 
            {
                contactos
            }
        )
    );
});

app.get('/contactos/:id', token.verify, async (req: Request, res: Response) => {
    
    const { id } = req.params;

    res.header("Access-Control-Allow-Origin", "*"); //Indicar el dominio a dar acceso
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    
    const contacto = await mongodb.db.collection('contactos').findOne({ "_id" : new ObjectId(id) });

    res.status(200).json(
        apiUtils.BodyResponse(
            apiStatusEnum.Succes, 'OK', 'La solicitud ha tenido exito', 
            {
                contacto
            }
        )
    );
});

app.get('/contactospublic/:id', async (req: Request, res: Response) => {
    
    const { id } = req.params;

    res.header("Access-Control-Allow-Origin", "*"); //Indicar el dominio a dar acceso
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    
    const contacto = await mongodb.db.collection('contactos').findOne({ "_id" : new ObjectId(id) }, {projection: { nombre: true, requerimientosEspeciales: true, confirmacionAsistencia: true }});

    res.status(200).json(
        apiUtils.BodyResponse(
            apiStatusEnum.Succes, 'OK', 'La solicitud ha tenido exito', 
            {
                contacto
            }
        )
    );
});

app.get('/contactos/:grupo/:tipo/:invitadoInforme/:invitacion', token.verify, async (req: Request, res: Response) => {

    const { grupo, tipo, invitadoInforme, invitacion } = req.params;
    const gruposArray = grupo.split(',')
    const tiposArray = tipo.split(',')
    const invitadoInformeArray = invitadoInforme.split(',')
    const invitacionArray = invitacion.split(',')

    res.header("Access-Control-Allow-Origin", "*"); //Indicar el dominio a dar acceso
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    
    const contactos = await mongodb.db.collection('contactos').find({ 'grupo': { $in: gruposArray }, 'tipo': { $in: tiposArray }, 'invitadoInforme': { $in: invitadoInformeArray }, 'tipoInvitacion': { $in: invitacionArray }, 'activo': '1' }).sort({"grupo" : 1, "nombre" : 1}).toArray();

    res.status(200).json(
        apiUtils.BodyResponse(
            apiStatusEnum.Succes, 'OK', 'La solicitud ha tenido exito', 
            {
                contactos
            } 
        )
    );
});

app.post('/contactos', token.verify, async (req: Request, res: Response) => { 
    delete req.body._id
    await mongodb.db.collection('contactos').insertOne(req.body, async function (err:any,result:any){
        res.status(200).json(
            apiUtils.BodyResponse(
                apiStatusEnum.Succes, 'OK', 'La solicitud ha tenido exito', 
                {
                     result
                }
            )
        ); 
    });
})

app.put('/contactos', token.verify, async (req: Request, res: Response) => {

    const id = req.body._id
    delete req.body._id
    const contacto = req.body

    const query = { "_id" : new ObjectId(id) }

    const updateDocument = { 
        $set : contacto 
    }
 
    const options = {
        "multi" : false,
        "upsert" : false
    }

    const result = await mongodb.db.collection('contactos').updateOne(query, updateDocument, options)

    res.status(200).json(
        apiUtils.BodyResponse(
            apiStatusEnum.Succes, 'OK', 'La solicitud ha tenido exito', 
            {
                result
            }
        )
    );
})

app.get('/contactosInforme', token.verify, async (req: Request, res: Response) => {
    
    const contactosInforme = await mongodb.db.collection('contactos').find({"invitadoInforme":"1"}).sort({"tipo" : 1}).toArray();

    res.status(200).json(
        apiUtils.BodyResponse(
            apiStatusEnum.Succes, 'OK', 'La solicitud ha tenido exito', 
            {
                contactosInforme
            }
        )
    );
});

app.post('/sendmail', token.verify, async (req: Request, res: Response) => {
    let email = req.body
    transporter.sendMail(email, (error: any, info: any) => {
        if(error){
            console.log("Error al enviar email");
            res.status(200).json(
                apiUtils.BodyResponse(
                    apiStatusEnum.Succes, 'OK', 'La solicitud ha tenido exito', 
                    {
                        error
                    }
                )
            );
        } else{
            console.log("Correo enviado correctamente");
            res.status(200).json(
                apiUtils.BodyResponse(
                    apiStatusEnum.Succes, 'OK', 'La solicitud ha tenido exito', 
                    {
                        info
                    }
                )
            );
        }
    })
})

app.put('/confirmarAsistenciaPublic', async (req: Request, res: Response) => {

    const _id = req.body._id
    delete req.body._id
    const contacto = req.body
    const query = { "_id" : new ObjectId(_id) }
    const updateDocument = { 
        $set : contacto 
    }
    const options = {
        "multi" : false,
        "upsert" : false
    }
    const result = await mongodb.db.collection('contactos').updateOne(query, updateDocument, options)
    let textoNotificacion: string
    if(contacto.confirmacionAsistencia === 'Si'){
        textoNotificacion = `${contacto['nombre']} ha confirmado su asistencia al informe.`
    }
    else{
        textoNotificacion = `${contacto['nombre']} ha confirmado su NO asistencia al informe.`
    }
    let notificacion = { fecha: moment().utcOffset('-0600').format('DD/MM/YYYY HH:mm'), text: textoNotificacion, username: contacto.nombre }
    const insert = await mongodb.db.collection('notificaciones').insertOne(notificacion);
    io.emit('confirmacion-asistencia-informe', insert.insertedId);

    res.status(200).json(
        apiUtils.BodyResponse(
            apiStatusEnum.Succes, 'OK', 'La solicitud ha tenido exito', 
            {
                result
            }
        )
    );
})

app.get('/subsistemas', token.verify, async (req: Request, res: Response) => {
    
    const subsistemas = await mongodb.db.collection('subsistemas').find().toArray();

    res.status(200).json(
        apiUtils.BodyResponse(
            apiStatusEnum.Succes, 'OK', 'La solicitud ha tenido exito', 
            {
                subsistemas
            }
        )
    );
});

app.put('/subsistemas', token.verify, multer.array('documents'), async (req: Request, res: Response) => {

    const id = req.body._id
    delete req.body._id
    const subsisema = req.body
    let files = JSON.parse(req.body['files'])
    if(req.files){
        let newFiles: any = req.files;
        for (let index = 0; index < newFiles.length; ++index) {
            files.push({
                'originalname': newFiles[index].originalname,
                'mimetype': newFiles[index].mimetype,
                'filename': newFiles[index].filename,
                'path': newFiles[index].path,
                'size': newFiles[index].size,
                'uploadDate': new Date().toLocaleString(),
                'user': subsisema['usuarioActualizacion']
            })
        }
    }
    req.body['files'] = files
    const query = { "_id" : new ObjectId(id) }
    const updateDocument = { 
        $set : subsisema 
    }
    const options = {
        "multi" : false,
        "upsert" : false
    }
    const result = await mongodb.db.collection('subsistemas').updateOne(query, updateDocument, options)
    res.status(200).json(
        apiUtils.BodyResponse(
            apiStatusEnum.Succes, 'OK', 'La solicitud ha tenido exito', 
            {
                result
            }
        )
    );
})

app.post('/combinardocumentos', token.verify, async (req: Request, res: Response) => {

    let documentos = req.body
    var fs = require('fs');
    var path = require('path');
    let rutas: any[] = []
    documentos.forEach((documento: any) => {
        rutas.push(fs.readFileSync(path.resolve(documento), 'binary'))
    });
    var docx = new DocxMerger({},rutas);
    let filename = uuidv4()
    let filePath = path.resolve("uploads",`${filename}.docx`)
    docx.save('nodebuffer',function (data: any) {
        fs.writeFile(filePath, data, function(err: any){
            res.status(200).json(
                apiUtils.BodyResponse(
                    apiStatusEnum.Succes, 'OK', 'La solicitud ha tenido exito', 
                    {
                        filename
                    }
                )
            );
        });
    });
})

app.post('/generartarjetacumpeanos', token.verify, multer.array('documents'), async (req: Request, res: Response) => { 

    const id = req.body._id
    delete req.body._id
    let cumpleanios = req.body
    let file: any
    if(req.files){
        let data: any = req.files; 
        file = data[0]; 
    }
    let felicitaciones: any[] = []
    if(cumpleanios.felicitaciones != ''){
        felicitaciones = JSON.parse(cumpleanios['felicitaciones'])
    }
    const options = {
        quality: 100,
        density: 1000,
        saveFilename: file.filename,
        savePath: "uploads/felicitaciones",
        format: "jpg",
        width: 778,
        height: 1100
    };

    const storeAsImage = fromPath(file.path, options);
    const pageToConvertAsImage = 1;

    storeAsImage(pageToConvertAsImage).then((resolve: any) => {
        let email = {
            from: 'antonio.amador@poderjudicial-gto.gob.mx',
            to: cumpleanios.correo,
            subject: '¡MUCHAS FELICIDADES!',
            html: `
            <p>
            <strong>${cumpleanios.nombre}</strong>
            <br/>
            <strong>${cumpleanios.puesto}</strong>
            <br/>
            <strong>P r e s e n t e.</strong>
            </p>
            <img style="display: block; margin-left: auto; margin-right: auto;" src="cid:${resolve.name}@poderjudicial-gto.gob.mx" />`,
            attachments: [{
                filename: resolve.name,
                path: resolve.path,
                cid: `${resolve.name}@poderjudicial-gto.gob.mx`
            }]
        }
        transporter.sendMail(email, async (error: any, info: any) => {
            if(error){
                console.log("Error al enviar email");
                res.status(200).json(
                    apiUtils.BodyResponse(
                        apiStatusEnum.Succes, 'OK', 'La solicitud ha tenido exito', 
                        {
                            error
                        }
                    )
                );
            } else{
                console.log("Correo enviado correctamente");
                felicitaciones.push({
                    'uploadDate': moment().utcOffset('-0600').format('YYYY-MM-DDTHH:mm'),
                    'user' : cumpleanios.usuarioActualizacion,
                    'mimetype': 'image/jpeg',
                    'filename': resolve.name,
                    'path': resolve.path,
                    'correo': cumpleanios.correo
                })
            
                cumpleanios.felicitaciones = felicitaciones
                const query = { "_id" : new ObjectId(id) }
                const updateDocument = { 
                    $set : cumpleanios 
                }
                const updateOptions = {
                    "multi" : false,
                    "upsert" : false
                }
                const result = await mongodb.db.collection('cumpleanios').updateOne(query, updateDocument, updateOptions)

                res.status(200).json(
                    apiUtils.BodyResponse(
                        apiStatusEnum.Succes, 'OK', 'La solicitud ha tenido exito', 
                        {
                            info
                        }
                    )
                );
            }
        })
    });
})

app.get('/cumpleanios', token.verify, async (req: Request, res: Response) => {
    
    const cumpleanios = await mongodb.db.collection('cumpleanios').find().toArray();

    res.status(200).json(
        apiUtils.BodyResponse(
            apiStatusEnum.Succes, 'OK', 'La solicitud ha tenido exito', 
            {
                cumpleanios
            }
        )
    );
});

app.get('/cumpleanios/:id', token.verify, async (req: Request, res: Response) => {
    
    const { id } = req.params;

    res.header("Access-Control-Allow-Origin", "*"); //Indicar el dominio a dar acceso
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    
    const cumpleanio = await mongodb.db.collection('cumpleanios').findOne({ "_id" : new ObjectId(id) });

    res.status(200).json(
        apiUtils.BodyResponse(
            apiStatusEnum.Succes, 'OK', 'La solicitud ha tenido exito', 
            {
                cumpleanio
            }
        )
    );
});

app.put('/cumpleanios', token.verify, multer.array('documents'), async (req: Request, res: Response) => {

    const id = req.body._id
    delete req.body._id
    const cumpleanio = req.body
    
    const query = { "_id" : new ObjectId(id) }
    const updateDocument = { 
        $set : cumpleanio 
    }
    const options = {
        "multi" : false,
        "upsert" : false
    }
    const result = await mongodb.db.collection('cumpleanios').updateOne(query, updateDocument, options)
    res.status(200).json(
        apiUtils.BodyResponse(
            apiStatusEnum.Succes, 'OK', 'La solicitud ha tenido exito', 
            {
                result
            }
        )
    );
})

app.post('/cumpleanios', token.verify, async (req: Request, res: Response) => {

    delete req.body._id
    req.body['felicitaciones'] = []
    await mongodb.db.collection('cumpleanios').insertOne(req.body, async function (err:any,result:any){
        res.status(200).json(
            apiUtils.BodyResponse(
                apiStatusEnum.Succes, 'OK', 'La solicitud ha tenido exito', 
                {
                     result
                }
            )
        ); 
    });
})

app.get('/calls', token.verify, async (req: Request, res: Response) => {
    const calls = await mongodb.db.collection('calls').find({activo:'1'}).toArray();
    res.status(200).json(
         apiUtils.BodyResponse(
             apiStatusEnum.Succes, 'OK', 'La solicitud ha tenido exito', 
             {
                  calls
             }
         )
     );
});

app.post('/calls', token.verify, async (req: Request, res: Response) => { 
    delete req.body._id
    let usuario = req.body['usuarioCreacion']
    await mongodb.db.collection('calls').insertOne(req.body, async function (err:any,result:any){
        let notificacion = { fecha: moment().utcOffset('-0600').format('DD/MM/YYYY HH:mm'), text: `Le informamos que ${usuario} agregó una llamada.`, username: usuario }
        const insert = await mongodb.db.collection('notificaciones').insertOne(notificacion);
        io.emit('call-inserted', insert.insertedId);
        res.status(200).json(
            apiUtils.BodyResponse(
                apiStatusEnum.Succes, 'OK', 'La solicitud ha tenido exito', 
                {
                     result
                }
            )
        ); 
    });
})

app.put('/calls', token.verify, async (req: Request, res: Response) => {

    const id = req.body._id
    delete req.body._id
    let usuario = req.body['usuarioActualizacion']
    const call = req.body
    const query = { "_id" : new ObjectId(id) }
    const updateDocument = { 
        $set : call 
    }
    const options = {
        "multi" : false,
        "upsert" : false
    }
    const result = await mongodb.db.collection('calls').updateOne(query, updateDocument, options)
    let notificacion = { fecha: moment().utcOffset('-0600').format('DD/MM/YYYY HH:mm'), text: `Le informamos que ${usuario} editó una llamada.`, username: usuario }
    const insert = await mongodb.db.collection('notificaciones').insertOne(notificacion);
    io.emit('call-edited', insert.insertedId);
    res.status(200).json(
        apiUtils.BodyResponse(
            apiStatusEnum.Succes, 'OK', 'La solicitud ha tenido exito', 
            {
                result
            }
        )
    );
})

app.get('/calls/:id', token.verify, async (req: Request, res: Response) => {
    const { id } = req.params;
    const call = await mongodb.db.collection('calls').findOne({ "_id" : new ObjectId(id) });
    res.status(200).json(
        apiUtils.BodyResponse(
            apiStatusEnum.Succes, 'OK', 'La solicitud ha tenido exito', 
            {
                call
            }
        )
    );
});

app.get('/test', async (req: Request, res: Response) => {
    
    const productos = await mongodb.db.collection('Productos').find().toArray();

    res.status(200).json(
        apiUtils.BodyResponse(
            apiStatusEnum.Succes, 'OK', 'La solicitud ha tenido exito', 
            {
                productos
            }
        )
    );
});

app.put('/test', async (req: Request, res: Response) => {

    console.log(req.body)
    const id = req.body._id
    delete req.body._id
    const producto = req.body
    
    const query = { "_id" : new ObjectId(id) }
    const updateDocument = { 
        $set : producto 
    }
    const options = {
        "multi" : false,
        "upsert" : false
    }
    const result = await mongodb.db.collection('Productos').updateOne(query, updateDocument, options)
    let notificacion = { fecha: moment().utcOffset('-0600').format('DD/MM/YYYY HH:mm'), text: `Le informamos que se compró el producto ${producto['producto']}`}
    const insert = await mongodb.db.collection('notificaciones').insertOne(notificacion);
    io.emit('compra-producto', insert.insertedId);
    res.status(200).json(
        apiUtils.BodyResponse(
            apiStatusEnum.Succes, 'OK', 'La solicitud ha tenido exito', 
            {
                result
            }
        )
    );
})

app.get('/test/:id', async (req: Request, res: Response) => {
    
    const { id } = req.params;

    res.header("Access-Control-Allow-Origin", "*"); //Indicar el dominio a dar acceso
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    
    const productos = await mongodb.db.collection('Productos').find({ "_id" : new ObjectId(id) }).toArray();

    res.status(200).json(
        apiUtils.BodyResponse(
            apiStatusEnum.Succes, 'OK', 'La solicitud ha tenido exito', 
            {
                productos
            }
        )
    );
});

app.post('/test', async (req: Request, res: Response) => { 
    delete req.body._id
    await mongodb.db.collection('Productos').insertOne(req.body, async function (err:any,result:any){
        res.status(200).json(
            apiUtils.BodyResponse(
                apiStatusEnum.Succes, 'OK', 'La solicitud ha tenido exito', 
                {
                     result
                }
            )
        ); 
    });
})

//Start Express Server
// app.listen(ENV.API.PORT, async() => {
//     //Conectando con MongoDB
//      try{
//          await mongodb.connect();
//      }catch(error){
//          process.exit();
//      }
//     debug.express(`El servidor ${color.express('Express')} se inició ${color.succes('correctamente')} en el puerto ${color.info(ENV.API.PORT)}`);
// });

//Start HTTTP Server
//Para demo
//httpServer.listen(ENV.API.PORT, '0.0.0.0', async() => {
httpServer.listen(ENV.API.PORT, async() => { 
    //Conectando con MongoDB
     try{
         await mongodb.connect();
     }catch(error){
         process.exit();
     }
    debug.express(`El servidor ${color.express('Express')} se inició ${color.succes('correctamente')} en el puerto ${color.info(ENV.API.PORT)}`);
}); 