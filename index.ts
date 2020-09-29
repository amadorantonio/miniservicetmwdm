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

const token = AuthToken(ENV);

//MongoDB helper import
import MongoDBHelper from './helpers/mongodb.helpers';

import path from 'path'

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


import bodyParser, { json } from 'body-parser'
import { ObjectId } from 'mongodb';

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
            jwt.sign(payload, ENV.TOKEN.SECRET_KEY, { expiresIn: ENV.TOKEN.EXPIRES }, (err, token) => {
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
    console.log('api-productos', productos);
    console.log('api-productos');

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
 
    const bitacora = await mongodb.db.collection('bitacora').find({ 'activo': '1' }).sort({Fecha : -1}).toArray();
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
        // console.log(date, meses[date.getMonth()], date.getMonth());
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

    console.log(arrayTableResult);

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

app.post('/bitacora', token.verify, async (req: Request, res: Response) => {
    await mongodb.db.collection('bitacora').insertOne(req.body);

    //envío de comunicación a todos los clientes conectados
    io.emit('alta-bitacora', 'Le informamos que se agregó un nuevo elemento de bitácora');

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

app.put('/bitacora', token.verify, async (req: Request, res: Response) => {

    const id = req.body._id
    delete req.body._id
    const bitacora = req.body



    await mongodb.db.collection('bitacora').update({
        "_id" : new ObjectId(id)
    },
    
    // update 
    bitacora,
    
    // options 
    {
        "multi" : false,  // update only one document 
        "upsert" : false  // insert a new document, if no existing document match the query 
    });

    //envío de comunicación a todos los clientes conectados
    io.emit('edicion-elemento-bitacora', 'Le informamos que se editó un elemento de bitácora');

    res.status(200).json(
        apiUtils.BodyResponse(
            apiStatusEnum.Succes, 'OK', 'La solicitud ha tenido exito', 
            {
                bitacora
            }
        )
    );
})

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
    io.emit('edicion-elemento-bitacora', 'Le informamos que se editó un elemento de bitácora');

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
        req.body['files'] = filesArray
    }

    await mongodb.db.collection('solicitudes-informacion').insertOne(req.body);

    //envío de comunicación a todos los clientes conectados
    io.emit('alta-solicitud-informacion', 'Le informamos que se agregó un nuevo elemento de solicitud de información');

    res.status(200).json(
        apiUtils.BodyResponse(
            apiStatusEnum.Succes, 'OK', 'La solicitud ha tenido exito', 
            {
                 body,
                 authUser: req.body.authUser
            }
        )
    ); 
})

app.put('/solicitudinformacion', token.verify, multer.array('documents'), async (req: Request, res: Response) => {

    const id = req.body._id
    delete req.body._id
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

    await mongodb.db.collection('solicitudes-informacion').update({
        "_id" : new ObjectId(id)
    },
    
    // update 
    solicitud,
    
    // options 
    {
        "multi" : false,  // update only one document 
        "upsert" : false  // insert a new document, if no existing document match the query 
    });

    //envío de comunicación a todos los clientes conectados
    io.emit('alta-solicitud-informacion', 'Le informamos que se agregó un nuevo elemento de solicitud de información');

    res.status(200).json(
        apiUtils.BodyResponse(
            apiStatusEnum.Succes, 'OK', 'La solicitud ha tenido exito', 
            {
                solicitud,
                authUser: req.body.authUser
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
    //console.log('api-productos', productos);

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
    //console.log('api-productos', productos);

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
    //console.log('api-productos', productos);

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

    
    let body = req.body
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
        req.body['files'] = filesArray
    }

    await mongodb.db.collection('reuniones').insertOne(req.body, function (err:any,result:any){
        io.emit('alta-reunion', 'Le informamos que se agregó una reunión');

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

    await mongodb.db.collection('reuniones').update({
        "_id" : new ObjectId(id)
    },
    
    // update 
    reunion,
    
    // options 
    {
        "multi" : false,  // update only one document 
        "upsert" : false  // insert a new document, if no existing document match the query 
    });

    //envío de comunicación a todos los clientes conectados
    io.emit('edicion-reunion', 'Le informamos que se edito un elemento de reunión');

    res.status(200).json(
        apiUtils.BodyResponse(
            apiStatusEnum.Succes, 'OK', 'La solicitud ha tenido exito', 
            {
                reunion
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

    res.status(200).json(
        apiUtils.BodyResponse(
            apiStatusEnum.Succes, 'OK', 'La solicitud ha tenido exito', 
            {
                idReunion
            }
        )
    );
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