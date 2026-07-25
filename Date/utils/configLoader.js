/**
 * configLoader.js - Carregador e gerenciador de configuracoes
 *
 * Fornece funcionalidades para carregar, salvar e validar
 * o arquivo de configuracao do bot.
 */

const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'configLoader',
  description: 'Carregador e gerenciador de configuracoes do bot',
  category: 'util',

  init: (bot, context) => {
    const configPath = path.join(__dirname, '..', '..', 'config.json');

    /**
     * Carrega a configuracao do arquivo
     * @returns {Object} Configuracao carregada
     */
    function loadConfig() {
      try {
        const data = fs.readFileSync(configPath, 'utf8');
        return JSON.parse(data);
      } catch (e) {
        context.logger.error('Erro ao carregar config.json:', e.message);
        return {};
      }
    }

    /**
     * Salva a configuracao no arquivo
     * @param {Object} cfg - Configuracao a ser salva
     */
    function saveConfig(cfg) {
      try {
        fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2), 'utf8');
        context.logger.info('Configuracao salva com sucesso.');
      } catch (e) {
        context.logger.error('Erro ao salvar config.json:', e.message);
      }
    }

    /**
     * Obtem um valor da configuracao por caminho
     * @param {string} keyPath - Caminho da chave (ex: 'bot.host')
     * @param {*} defaultValue - Valor padrao se nao encontrado
     * @returns {*} Valor encontrado
     */
    function get(keyPath, defaultValue = null) {
      const keys = keyPath.split('.');
      let value = context.config;
      for (const key of keys) {
        if (value && typeof value === 'object' && key in value) {
          value = value[key];
        } else {
          return defaultValue;
        }
      }
      return value;
    }

    /**
     * Define um valor na configuracao
     * @param {string} keyPath - Caminho da chave
     * @param {*} value - Valor a definir
     */
    function set(keyPath, value) {
      const keys = keyPath.split('.');
      let obj = context.config;
      for (let i = 0; i < keys.length - 1; i++) {
        if (!obj[keys[i]]) obj[keys[i]] = {};
        obj = obj[keys[i]];
      }
      obj[keys[keys.length - 1]] = value;
    }

    // Adiciona metodos ao contexto
    context.configLoader = { loadConfig, saveConfig, get, set };
    context.logger.info('Carregador de configuracao inicializado.');
  }
};
