import { Request, Response, NextFunction, response} from 'express'
import jwt from 'jsonwebtoken'
import { APIUtils, apiStatusEnum } from '../utils/api.utils'
import ENV from '../enviroments/env.production'

//const apiUtils = APIUtils(ENV);

export default (CONFIG:any) =>{
    const apiUtils = APIUtils(ENV);
    return {
        verify: (req: Request, res: Response, next: NextFunction) => {

            res.header("Access-Control-Allow-Origin", "*");
            res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");

            const baererHeader = req.headers['authorization'];
            if(typeof baererHeader != 'undefined'){
                const baerer = baererHeader.split(' ');
                const bearerToken = baerer[1];

                jwt.verify(bearerToken, CONFIG.TOKEN.SECRET_KEY, (err: any, tokenDecoded: any) => {
                    if(err){
                        return res.status(apiStatusEnum.Forbidden).json(
                            apiUtils.BodyResponse(
                                apiStatusEnum.Forbidden,
                                //Descripcion
                                'Acceso Prohibido al verificar el token',
                                //Mensaje
                                'El token proporcionado no es valido, favor de verificar',
                                //result
                                {},
                                //error
                                err,
                            )
                        )
                    }
                    //req.body.authUser = tokenDecoded;
                    next();
                });
            }
            else{
                // Unautorized
                return res.status(apiStatusEnum.Forbidden).json(
                    apiUtils.BodyResponse(
                        apiStatusEnum.Unauthorized,
                        //Descripcion
                        'Acceso NO autorizado',
                        //Mensaje
                        'Necesita proporiconar un Token para acceder a la solicitud',
                        //result
                        {},
                        //error
                        {},
                    )
                )
            }
        }
    }
}

