/**
 * helpers.js - Funcoes utilitarias para o bot
 *
 * Fornece funcoes auxiliares para manipulacao de blocos,
 * inventario, posicao e outras operacoes comuns.
 */

module.exports = {
  name: 'helpers',
  description: 'Funcoes utilitarias para manipulacao de blocos, inventario e posicao',
  category: 'util',

  init: (bot, context) => {
    const helpers = {};

    /**
     * Encontra blocos proximos do bot
     * @param {string|Array} blockName - Nome do bloco ou lista de nomes
     * @param {number} radius - Raio de busca
     * @returns {Array} Lista de blocos encontrados
     */
    helpers.findBlocks = (blockName, radius = 32) => {
      const names = Array.isArray(blockName) ? blockName : [blockName];
      let blocks = [];
      for (const name of names) {
        blocks = blocks.concat(bot.findBlocks(name, radius));
      }
      return blocks;
    };

    /**
     * Encontra o bloco mais proximo
     * @param {string|Array} blockName - Nome do bloco
     * @param {number} radius - Raio de busca
     * @returns {Object|null} Bloco mais proximo
     */
    helpers.findNearestBlock = (blockName, radius = 32) => {
      const blocks = helpers.findBlocks(blockName, radius);
      if (blocks.length === 0) return null;

      const sorted = blocks
        .map(b => ({ block: bot.blockAt(b), dist: b.distanceTo(bot.entity.position) }))
        .sort((a, b) => a.dist - b.dist);

      return sorted[0].block;
    };

    /**
     * Conta itens no inventario
     * @param {string} itemName - Nome do item
     * @returns {number} Quantidade total
     */
    helpers.countItem = (itemName) => {
      const items = bot.inventory.items();
      return items
        .filter(item => item.name === itemName)
        .reduce((sum, item) => sum + item.count, 0);
    };

    /**
     * Encontra slots com um item especifico
     * @param {string} itemName - Nome do item
     * @returns {Array} Lista de slots
     */
    helpers.findItemSlots = (itemName) => {
      return bot.inventory.items()
        .filter(item => item.name === itemName)
        .map(item => item.slot);
    };

    /**
     * Verifica se o inventario esta cheio
     * @returns {boolean}
     */
    helpers.isInventoryFull = () => {
      const items = bot.inventory.items();
      const emptySlots = items.filter(item => item.type === 0).length;
      return emptySlots === 0;
    };

    /**
     * Formata uma posicao para exibicao
     * @param {Object} pos - Posicao (x, y, z)
     * @returns {string} Posicao formatada
     */
    helpers.formatPosition = (pos) => {
      if (!pos) return 'desconhecida';
      return `${Math.floor(pos.x)}, ${Math.floor(pos.y)}, ${Math.floor(pos.z)}`;
    };

    /**
     * Calcula distancia entre duas posicoes
     * @param {Object} pos1 - Primeira posicao
     * @param {Object} pos2 - Segunda posicao
     * @returns {number} Distancia
     */
    helpers.distance = (pos1, pos2) => {
      if (!pos1 || !pos2) return Infinity;
      const dx = pos1.x - pos2.x;
      const dy = pos1.y - pos2.y;
      const dz = pos1.z - pos2.z;
      return Math.sqrt(dx * dx + dy * dy + dz * dz);
    };

    /**
     * Aguarda um condicao ser verdadeira
     * @param {Function} condition - Funcao de condicao
     * @param {number} timeout - Timeout em ms
     * @param {number} interval - Intervalo de verificacao
     * @returns {Promise} Promise resolvida quando a condicao for verdadeira
     */
    helpers.waitUntil = (condition, timeout = 5000, interval = 200) => {
      return new Promise((resolve, reject) => {
        const start = Date.now();
        const check = () => {
          if (condition()) {
            resolve(true);
          } else if (Date.now() - start >= timeout) {
            reject(new Error('Timeout aguardando condicao.'));
          } else {
            setTimeout(check, interval);
          }
        };
        check();
      });
    };

    /**
     * Envia uma mensagem no chat
     * @param {string} message - Mensagem
     */
    helpers.chat = (message) => {
      bot.chat(message);
    };

    /**
     * Verifica se o bot esta online
     * @returns {boolean}
     */
    helpers.isOnline = () => {
      return bot && bot.entity && bot.entity.position;
    };

    // Adiciona ao contexto
    context.helpers = helpers;
    context.logger.info('Modulo de utilitarios (helpers) inicializado.');
  }
};
