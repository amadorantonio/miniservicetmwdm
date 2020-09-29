import { MongoClient } from 'mongodb';
import { DEBUG, COLOR } from '../utils/debug'

const debug = DEBUG();
const color = COLOR();

export default class MongoDB{
    public db: any;
    private cnn: any;
    private port: number;
    private dbUri: string;
    private static _instance: MongoDB;

    constructor(CONFIG: any){
        this.port = CONFIG.MONGODB.PORT;
        if(CONFIG.MONGODB.USER_NAME != ''){
            this.dbUri = `mongodb://${CONFIG.MONGODB.USER_NAME}:${CONFIG.MONGODB.USER_PASSWORD}@${CONFIG.MONGODB.HOST}:${CONFIG.MONGODB.PORT}/${CONFIG.MONGODB.DEFAULT_DATABASE}`;
        }
        else{
            this.dbUri = `mongodb//${CONFIG.MONGODB.HOST}:${CONFIG.MONGODB.PORT}/${CONFIG.MONGODB.DEFAULT_DATABASE}`;
        }
    }

    public static getInstance(CONFIG: any){
        return this._instance || (this._instance = new this(CONFIG));
    }

    async connect(){
        await MongoClient.connect(this.dbUri, { useNewUrlParser: true, useUnifiedTopology: true}).then((connection: any) => {
            debug.express(`El servidor ${color.mongoDB('MongoDB')} se inició ${color.succes('correctamente')} en el puerto ${color.info(this.port)}`);
            this.cnn = connection;
            this.db = this.cnn.db();
        }).catch((err: any) => {
            console.log('Ocurrió un error al conectarse a MongoDB', err);
        })
    }

    setDataBase(dbName: string){
        this.db = this.cnn.db(dbName);
    }
}