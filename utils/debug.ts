import chalk from 'chalk';

export const DEBUG = () => {
    return{
        express: require('debug')('api:[Express]'),
        mongoDB: require('debug')('api:[MongoDB]')
    }
}

export const COLOR = () => {
    return{
        express: chalk.bgHex('#333333').whiteBright.bold,
        mongoDB: chalk.bgHex('#412F20').hex('#589636').bold,
        succes: chalk.greenBright.bold,
        danger: chalk.redBright.bold,
        warning: chalk.yellowBright.bold,
        info: chalk.white.bold
    }
}