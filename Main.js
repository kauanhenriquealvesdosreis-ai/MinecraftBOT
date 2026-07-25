/**
 * Main.js - Ponto de entrada principal do MinecraftBOT
 *
 * Este script cria o bot do Minecraft e carrega automaticamente todos os
 * scripts localizados na pasta "Date" e suas subpastas. Cada script deve
 * exportar um objeto com a interface padrao de modulo.
 *
 * Estrutura da pasta Date:
 *   Date/
 *     core/       - Modulos centrais (botManager, chatHandler, commandRegistry)
 *     modules/    - Modulos de funcionalidades (navigation, mining, farming, etc)
 *     patches/    - Patches de protecao e otimizacao (antiAFK, autoReconnect, etc)
 *     utils/      - Utilitarios (logger, configLoader, helpers)
 *
 * Interface de um modulo:
 *   module.exports = {
 *     name: 'nomeDoModulo',
 *     description: 'Descricao do modulo',
 *     category: 'core|module|patch|util',
 *     init: (bot, context) => { ... },
 *     onEnable: () => { ... },
 *     onDisable: () => { ... }
 *   };
 */

const fs = require('fs');
const path = require('path');
const mineflayer = require('mineflayer');
const { pathfinder } = require('mineflayer-pathfinder');

// ==================== CONFIGURACAO ====================
const CONFIG_PATH = path.join(__dirname, 'config.json');
const DATE_FOLDER = path.join(__dirname, 'Date');

let config = {};
try {
  config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
} catch (e) {
  console.error('[Main] Erro ao carregar config.json:', e.message);
  process.exit(1);
}

// ==================== CONTEXTO COMPARTILHADO ====================
const context = {
  config,
  modules: new Map(),
  moduleList: [],
  events: [],
  logger: null,
  commandRegistry: null,
  bot: null,
  isEnabled: false,
  loadOrder: config.modules?.loadOrder || ['core', 'utils', 'patches', 'modules']
};

// ==================== SISTEMA DE LOG ====================
class Logger {
  constructor(level = 'info') {
    this.level = level;
    this.levels = { debug: 0, info: 1, warn: 2, error: 3 };
  }

  _log(level, message, ...args) {
    if (this.levels[level] < this.levels[this.level]) return;
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    console.log(prefix, message, ...args);
  }

  debug(message, ...args) { this._log('debug', message, ...args); }
  info(message, ...args) { this._log('info', message, ...args); }
  warn(message, ...args) { this._log('warn', message, ...args); }
  error(message, ...args) { this._log('error', message, ...args); }
}

context.logger = new Logger(config.logging?.level || 'info');

// ==================== CARREGADOR DE SCRIPTS ====================
/**
 * Carrega recursivamente todos os arquivos .js de uma pasta
 * @param {string} dir - Diretorio para carregar scripts
 * @returns {Array} Lista de modulos carregados
 */
function loadScripts(dir) {
  const modules = [];

  if (!fs.existsSync(dir)) {
    context.logger.warn(`Pasta "${path.basename(dir)}" nao encontrada. Criando...`);
    fs.mkdirSync(dir, { recursive: true });
    return modules;
  }

  const items = fs.readdirSync(dir, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(dir, item.name);

    if (item.isDirectory()) {
      // Carrega recursivamente subpastas
      modules.push(...loadScripts(fullPath));
    } else if (item.isFile() && item.name.endsWith('.js')) {
      try {
        // Limpa o cache para permitir recarregamento
        delete require.cache[require.resolve(fullPath)];

        const mod = require(fullPath);

        if (typeof mod !== 'object' || mod === null) {
          context.logger.warn(`Modulo "${item.name}" ignorado: exportacao invalida.`);
          continue;
        }

        mod.__filepath = fullPath;
        mod.__filename = item.name;
        mod.category = mod.category || path.basename(path.dirname(fullPath));
        mod.enabled = mod.enabled !== false;

        modules.push(mod);
        context.logger.debug(`Script carregado: ${item.name} (${mod.category})`);
      } catch (e) {
        context.logger.error(`Erro ao carregar script "${item.name}":`, e.message);
      }
    }
  }

  return modules;
}

/**
 * Inicializa todos os modulos carregados
 * @param {Array} modules - Lista de modulos
 */
function initModules(modules) {
  // Ordena os modulos pela ordem de carregamento definida na config
  const sorted = modules.slice().sort((a, b) => {
    const order = context.loadOrder;
    const catA = order.indexOf(a.category);
    const catB = order.indexOf(b.category);
    const idxA = catA === -1 ? order.length : catA;
    const idxB = catB === -1 ? order.length : catB;
    return idxA - idxB;
  });

  for (const mod of sorted) {
    // Pula modulos desativados na config
    if (config.modules?.disabledModules?.includes(mod.name)) {
      context.logger.info(`Modulo "${mod.name}" desativado na configuracao.`);
      mod.enabled = false;
      continue;
    }

    try {
      if (mod.init && typeof mod.init === 'function') {
        mod.init(context.bot, context);
        context.modules.set(mod.name, mod);
        context.moduleList.push(mod);
        context.logger.info(`Modulo "${mod.name}" inicializado. (${mod.category})`);

        if (mod.onEnable && typeof mod.onEnable === 'function') {
          mod.onEnable();
        }
      }
    } catch (e) {
      context.logger.error(`Erro ao inicializar modulo "${mod.name}":`, e.message);
    }
  }
}

// ==================== CRIACAO DO BOT ====================
function createBot() {
  const botOptions = {
    host: config.bot.host,
    port: config.bot.port,
    username: config.bot.username,
    version: config.bot.version,
    hideServer: config.bot.hideServer,
    auth: config.bot.auth
  };

  context.logger.info('Criando bot do Minecraft...');
  context.logger.info(`Conectando a ${botOptions.host}:${botOptions.port}`);

  const bot = mineflayer.createBot(botOptions);

  // Carrega o plugin de pathfinding
  bot.loadPlugin(pathfinder);

  context.bot = bot;

  // ==================== EVENTOS DO BOT ====================
  bot.once('spawn', () => {
    context.logger.info('Bot conectado e spawnado com sucesso!');
    context.isEnabled = true;

    // Carrega e inicializa todos os scripts da pasta Date
    context.logger.info('Carregando scripts da pasta Date...');
    const scripts = loadScripts(DATE_FOLDER);
    context.logger.info(`Total de scripts carregados: ${scripts.length}`);

    initModules(scripts);
    context.logger.info('Todos os modulos foram inicializados.');
  });

  bot.on('chat', (username, message) => {
    if (username === bot.username) return;
    if (config.chat?.logChat) {
      context.logger.info(`[CHAT] ${username}: ${message}`);
    }

    // Envia o evento para todos os modulos registrados
    for (const mod of context.moduleList) {
      if (mod.onChat && typeof mod.onChat === 'function') {
        try {
          mod.onChat(username, message, bot, context);
        } catch (e) {
          context.logger.error(`Erro no modulo "${mod.name}" ao processar chat:`, e.message);
        }
      }
    }
  });

  bot.on('error', (err) => {
    context.logger.error('Erro do bot:', err.message);
  });

  bot.on('end', (code) => {
    context.isEnabled = false;
    context.logger.warn(`Bot desconectado (codigo: ${code}).`);

    // Notifica modulos sobre a desconexao
    for (const mod of context.moduleList) {
      if (mod.onDisable && typeof mod.onDisable === 'function') {
        try {
          mod.onDisable();
        } catch (e) {
          context.logger.error(`Erro no modulo "${mod.name}" ao desativar:`, e.message);
        }
      }
    }

    // Tenta reconectar se o patch estiver ativo
    const autoReconnect = context.modules.get('autoReconnect');
    if (autoReconnect && autoReconnect.onDisconnect) {
      autoReconnect.onDisconnect(code);
    } else if (config.autoReconnect?.enabled) {
      context.logger.info(`Tentando reconectar em ${config.autoReconnect.delay}ms...`);
      setTimeout(() => {
        createBot();
      }, config.autoReconnect.delay);
    }
  });

  bot.on('kicked', (reason) => {
    context.logger.warn('Bot foi expulso:', reason);
  });

  return bot;
}

// ==================== INICIALIZACAO ====================
context.logger.info('=== MinecraftBOT iniciando ===');
context.logger.info(`Versao do mineflayer: ${require('mineflayer/package.json').version}`);

// Cria o bot
createBot();

// Exporta o contexto para uso externo
module.exports = { context, createBot, loadScripts, initModules };
