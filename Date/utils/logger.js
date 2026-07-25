/**
 * logger.js - Sistema de logging centralizado
 *
 * Fornece funcionalidades de log com niveis de severidade,
 * cores no console e opcao de gravar em arquivo.
 */

const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'logger',
  description: 'Sistema de logging centralizado com niveis de severidade',
  category: 'util',

  init: (bot, context) => {
    const config = context.config.logging || {};

    class Logger {
      constructor(level = 'info', logToFile = false, logFilePath = 'bot.log') {
        this.level = level;
        this.logToFile = logToFile;
        this.logFilePath = logFilePath;
        this.levels = { debug: 0, info: 1, warn: 2, error: 3 };
        this.colors = {
          debug: '\x1b[36m',
          info: '\x1b[32m',
          warn: '\x1b[33m',
          error: '\x1b[31m',
          reset: '\x1b[0m'
        };
      }

      _log(level, message, ...args) {
        if (this.levels[level] < this.levels[this.level]) return;

        const timestamp = new Date().toISOString();
        const color = this.colors[level] || '';
        const reset = this.colors.reset;
        const prefix = `${color}[${timestamp}] [${level.toUpperCase()}]${reset}`;

        console.log(prefix, message, ...args);

        if (this.logToFile) {
          const logLine = `[${timestamp}] [${level.toUpperCase()}] ${message} ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ')}\n`;
          try {
            const logPath = path.resolve(this.logFilePath);
            fs.appendFileSync(logPath, logLine);
          } catch (e) {
            // Ignora erros de escrita em arquivo
          }
        }
      }

      debug(message, ...args) { this._log('debug', message, ...args); }
      info(message, ...args) { this._log('info', message, ...args); }
      warn(message, ...args) { this._log('warn', message, ...args); }
      error(message, ...args) { this._log('error', message, ...args); }
    }

    // Substitui o logger do contexto pelo logger mais avancado
    context.logger = new Logger(
      config.level || 'info',
      config.logToFile || false,
      config.logFile || 'bot.log'
    );

    context.logger.info('Sistema de logging inicializado.');
  }
};
