export enum apiStatusEnum {
    Succes = 200,
    Creaated = 201,
    Bad_Request = 400,
    Unauthorized = 401,
    Forbidden = 403,
    Internal_Server_Error = 500
}

export const APIUtils = (ENV: any) => {
    return{
        BodyResponse: (status: apiStatusEnum, description: string, message: string, result: any = null, error: any = null) => {
            return{
                microService: ENV.API.NAME,
                enviroment : ENV.API.ENVIROMENT,
                status,
                description,
                message,
                result,
                error
            }
        }
    }
}