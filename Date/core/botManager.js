/**
 * botManager.js - Gerenciador central do bot
 *
 * Gerencia o ciclo de vida do bot, estado de conexao,
 * informacoes do jogador e operacoes de manutencao.
 */

module.exports = {
  name: 'botManager',
  description: 'Gerenciador central do ciclo de vida e estado do bot',
  category: 'core',

  init: (bot, context) => {
    const state = {
      connected: false,
      spawnTime: null,
      reconnectAttempts: 0,
      lastPosition: null,
      stats: {
        messagesSent: 0,
        blocksMined: 0,
        blocksPlaced: 0,
        distanceTraveled: 0
      }
    };

    // ==================== EVENTOS DE CONEXAO ====================
    bot.on('spawn', () => {
      state.connected = true;
      state.spawnTime = Date.now();
      state.reconnectAttempts = 0;
      context.logger.info('BotManager: Bot spawnado. Estado atualizado.');
    });

    bot.on('end', () => {
      state.connected = false;
      context.logger.warn('BotManager: Bot desconectado.');
    });

    bot.on('error', (err) => {
      context.logger.error('BotManager: Erro capturado:', err.message);
    });

    // ==================== EVENTOS DE ESTATISTICAS ====================
    bot.on('chat', (username, message) => {
      if (username === bot.username) {
        state.stats.messagesSent++;
      }
    });

    bot.on('blockPlaced', () => {
      state.stats.blocksPlaced++;
    });

    bot.on('blockUpdate', (oldBlock, newBlock) => {
      if (newBlock && newBlock.type === 0 && oldBlock && oldBlock.type !== 0) {
        state.stats.blocksMined++;
      }
    });

    // ==================== MONITORAMENTO DE POSICAO ====================
    let lastPos = null;
    bot.on('physicTick', () => {
      if (bot.entity && bot.entity.position) {
        if (lastPos) {
          const dx = bot.entity.position.x - lastPos.x;
          const dy = bot.entity.position.y - lastPos.y;
          const dz = bot.entity.position.z - lastPos.z;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
          if (dist > 0.1) {
            state.stats.distanceTraveled += dist;
          }
        }
        lastPos = { ...bot.entity.position };
        state.lastPosition = { ...bot.entity.position };
      }
    });

    // ==================== METODOS PUBLICOS ====================
    context.botManager = {
      /**
       * Obtem o estado atual do bot
       * @returns {Object} Estado do bot
       */
      getState: () => ({ ...state }),

      /**
       * Verifica se o bot esta conectado
       * @returns {boolean}
       */
      isConnected: () => state.connected,

      /**
       * Obtem as estatisticas do bot
       * @returns {Object} Estatisticas
       */
      getStats: () => ({ ...state.stats }),

      /**
       * Obtem a posicao atual do bot
       * @returns {Object|null} Posicao
       */
      getPosition: () => state.lastPosition,

      /**
       * Obtem o tempo desde o spawn
       * @returns {number} Milissegundos desde o spawn
       */
      getUptime: () => state.spawnTime ? Date.now() - state.spawnTime : 0,

      /**
       * Reseta as estatisticas
       */
      resetStats: () => {
        state.stats = {
          messagesSent: 0,
          blocksMined: 0,
          blocksPlaced: 0,
          distanceTraveled: 0
        };
        context.logger.info('BotManager: Estatisticas resetadas.');
      },

      /**
       * Obtem informacoes do jogador
       * @returns {Object} Informacoes do jogador
       */
      getPlayerInfo: () => {
        if (!bot.player) return null;
        return {
          username: bot.player.username,
          type: bot.player.type,
          gameMode: bot.game?.mode || 'desconhecido',
          dimension: bot.game?.dimension || 'desconhecido',
          serverHost: bot.player.host || 'desconhecido'
        };
      }
    };

    context.logger.info('BotManager inicializado.');
  },

  onEnable: () => {
    // Chamado quando o modulo e ativado
  },

  onDisable: () => {
    // Chamado quando o modulo e desativado
  }
};
