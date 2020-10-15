export default {
    API: {
        NAME: 'Micro-Servicio Sistema de Control de Presidencia | NODEJs',
        PORT: 5000,
        ENVIRONMENT: 'Development'
    },
    NOTIFY: {
        DELAY: 1000 * 10        // 10 Segundos
    },
    TOKEN: {
        SECRET_KEY: "Pr351d3nc14_Poder$_judic14l",
        //EXPIRES: 60 * 60 * 4    // 4 Horas
        EXPIRES: 60 * 60 * 12   // 12 horas
    },
    MONGODB: {
        HOST: 'localhost',
        PORT: 27017,
        USER_NAME: 'dba-operador',
        USER_PASSWORD: 'operador123',
        DEFAULT_DATABASE: 'presidencia'
    }
    // MONGODB: {
    //     HOST: '192.168.91.130',
    //     PORT: 27017,
    //     USER_NAME: 'presidencia',
    //     USER_PASSWORD: 'Tjen-681223!',
    //     DEFAULT_DATABASE: 'presidencia'
    // }
    // MONGODB: {
    //     HOST: '10.1.200.37',
    //     PORT: 27017,
    //     USER_NAME: 'presidencia',
    //     USER_PASSWORD: 'Tjen-681223!',
    //     DEFAULT_DATABASE: 'presidencia'
    // }
};