/**
 * chatHandler.js - Gerenciador de mensagens de chat
 *
 * Processa mensagens de chat recebidas, filtra comandos,
 * e distribui eventos para os modulos registrados.
 */

module.exports = {
  name: 'chatHandler',
  description: 'Gerenciador de processamento de mensagens de chat',
  category: 'core',

  init: (bot, context) => {
    const config = context.config.chat || {};
    const prefix = config.prefix || '!';
    const chatHistory = [];
    const MAX_HISTORY = 100;

    /**
     * Processa uma mensagem de chat
     * @param {string} username - Nome do jogador que enviou
     * @param {string} message - Mensagem recebida
     */
    function processChat(username, message) {
      // Ignora mensagens do proprio bot
      if (username === bot.username) return;

      // Armazena no historico
      chatHistory.push({
        username,
        message,
        timestamp: Date.now()
      });
      if (chatHistory.length > MAX_HISTORY) {
        chatHistory.shift();
      }

      // Loga a mensagem
      if (config.logChat) {
        context.logger.info(`[CHAT] ${username}: ${message}`);
      }

      // Verifica se e um comando
      if (message.startsWith(prefix)) {
        const args = message.slice(prefix.length).trim().split(/ +/);
        const command = args.shift().toLowerCase();

        // Notifica o commandRegistry
        if (context.commandRegistry) {
          context.commandRegistry.execute(command, args, username, message);
        }

        // Notifica outros modulos
        for (const mod of context.moduleList) {
          if (mod.onCommand && typeof mod.onCommand === 'function') {
            try {
              mod.onCommand(command, args, username, message);
            } catch (e) {
              context.logger.error(`Erro no modulo "${mod.name}" ao processar comando:`, e.message);
            }
          }
        }
      }

      // Notifica modulos sobre mensagem de chat
      for (const mod of context.moduleList) {
        if (mod.onChat && typeof mod.onChat === 'function') {
          try {
            mod.onChat(username, message, bot, context);
          } catch (e) {
            context.logger.error(`Erro no modulo "${mod.name}" ao processar chat:`, e.message);
          }
        }
      }
    }

    // Registra o handler de chat no bot
    bot.on('chat', processChat);

    // ==================== METODOS PUBLICOS ====================
    context.chatHandler = {
      /**
       * Obtem o historico de chat
       * @param {number} limit - Numero maximo de mensagens
       * @returns {Array} Historico de chat
       */
      getHistory: (limit = 50) => {
        return chatHistory.slice(-limit);
      },

      /**
       * Envia uma mensagem no chat
       * @param {string} message - Mensagem a enviar
       */
      sendChat: (message) => {
        bot.chat(message);
      },

      /**
       * Envia uma mensagem privada para um jogador
       * @param {string} player - Nome do jogador
       * @param {string} message - Mensagem
       */
      sendPrivateMessage: (player, message) => {
        bot.chat(`/msg ${player} ${message}`);
      },

      /**
       * Obtem o prefixo de comandos
       * @returns {string} Prefixo
       */
      getPrefix: () => prefix,

      /**
       * Limpa o historico de chat
       */
      clearHistory: () => {
        chatHistory.length = 0;
        context.logger.info('ChatHandler: Historico de chat limpo.');
      }
    };

    context.logger.info('ChatHandler inicializado.');
  },

  onEnable: () => {},
  onDisable: () => {}
};
