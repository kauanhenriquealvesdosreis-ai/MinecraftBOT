/**
 * mining.js - Modulo de mineracao automatica
 *
 * Fornece funcionalidades para minerar blocos, encontrar
 * minerais, auto-smelt e gerenciar o inventario durante a mineracao.
 */

module.exports = {
  name: 'mining',
  description: 'Modulo de mineracao automatica de minerais e blocos',
  category: 'module',

  init: (bot, context) => {
    const config = context.config.mining || {};
    const oreTypes = config.mineOres || [
      'diamond_ore', 'iron_ore', 'gold_ore', 'redstone_ore',
      'lapis_ore', 'coal_ore', 'emerald_ore', 'copper_ore',
      'nether_quartz_ore', 'nether_gold_ore', 'ancient_debris'
    ];

    let miningEnabled = config.autoMine || false;
    let miningInterval = null;

    // ==================== FUNCOES DE MINERACAO ====================
    /**
     * Encontra blocos de minerais proximos
     * @param {number} radius - Raio de busca
     * @returns {Array} Blocos encontrados
     */
    function findOres(radius = 32) {
      if (!context.helpers) return [];
      const blocks = [];
      for (const oreType of oreTypes) {
        const found = context.helpers.findBlocks(oreType, radius);
        for (const pos of found) {
          const block = bot.blockAt(pos);
          if (block && block.type !== 0) {
            blocks.push(block);
          }
        }
      }
      return blocks;
    }

    /**
     * Encontra o bloco de minerais mais proximo
     * @param {number} radius - Raio de busca
     * @returns {Object|null} Bloco mais proximo
     */
    function findNearestOre(radius = 32) {
      if (!context.helpers) return null;
      return context.helpers.findNearestBlock(oreTypes, radius);
    }

    /**
     * Marca um bloco para minerar
     * @param {Object} block - Bloco a minerar
     */
    function mineBlock(block) {
      if (!block) return;
      bot.setControlState('sprint', false);
      bot.dig(block);
    }

    /**
     * Ativa/desativa a mineracao automatica
     * @param {boolean} enabled - Se a mineracao deve estar ativa
     */
    function setAutoMine(enabled) {
      miningEnabled = enabled;

      if (miningInterval) {
        clearInterval(miningInterval);
        miningInterval = null;
      }

      if (enabled) {
        miningInterval = setInterval(() => {
          if (!context.navigation) return;
          if (context.navigation.isMoving()) return;

          const nearestOre = findNearestOre(32);
          if (nearestOre) {
            context.logger.debug(`Mineracao: Encontrado ${nearestOre.name} proximo.`);
            context.navigation.goToBlock(nearestOre, 3).then(() => {
              mineBlock(nearestOre);
            }).catch(e => {
              context.logger.debug(`Mineracao: Erro ao navegar: ${e.message}`);
            });
          }
        }, 2000);
        context.logger.info('Mineracao automatica ATIVADA.');
      } else {
        context.logger.info('Mineracao automatica DESATIVADA.');
      }
    }

    /**
     * Conta todos os blocos de minerais no inventario
     * @returns {Object} Contagem por tipo
     */
    function countOres() {
      const result = {};
      const oreItems = [
        'diamond', 'iron_ingot', 'gold_ingot', 'redstone',
        'lapis_lazuli', 'coal', 'emerald', 'copper_ingot',
        'raw_iron', 'raw_gold', 'raw_copper', 'ancient_debris',
        'nether_quartz', 'raw_iron_block', 'raw_gold_block'
      ];

      for (const item of oreItems) {
        if (context.helpers) {
          const count = context.helpers.countItem(item);
          if (count > 0) {
            result[item] = count;
          }
        }
      }
      return result;
    }

    /**
     * Verifica se o inventario esta cheio
     * @returns {boolean}
     */
    function isInventoryFull() {
      if (!context.helpers) return false;
      return context.helpers.isInventoryFull();
    }

    // ==================== EVENTOS ====================
    bot.on('chat', (username, message) => {
      // Processamento de comandos de mineracao via chat
    });

    // ==================== REGISTRO DE COMANDOS ====================
    const prefix = context.chatHandler ? context.chatHandler.getPrefix() : '!';

    if (context.commandRegistry) {
      const cr = context.commandRegistry;

      cr.register('minerar', {
        description: 'Ativa/desativa a mineracao automatica',
        usage: `${prefix}minerar [on/off]`,
        category: 'mineracao',
        aliases: ['mine', 'autmine'],
        execute: (args) => {
          if (args[0] === 'on' || args[0] === 'true' || args[0] === '1') {
            setAutoMine(true);
            bot.chat('Mineracao automatica ATIVADA.');
          } else if (args[0] === 'off' || args[0] === 'false' || args[0] === '0') {
            setAutoMine(false);
            bot.chat('Mineracao automatica DESATIVADA.');
          } else {
            setAutoMine(!miningEnabled);
            bot.chat(`Mineracao automatica ${miningEnabled ? 'ATIVADA' : 'DESATIVADA'}.`);
          }
        }
      });

      cr.register('minerios', {
        description: 'Lista os minerais encontrados no inventario',
        usage: `${prefix}minerios`,
        category: 'mineracao',
        aliases: ['ores', 'recursos'],
        execute: () => {
          const ores = countOres();
          const keys = Object.keys(ores);
          if (keys.length === 0) {
            bot.chat('Nenhum minerais encontrado no inventario.');
            return;
          }
          const summary = keys.map(k => `${k}: ${ores[k]}`).join(', ');
          bot.chat(`Minerais: ${summary}`);
        }
      });

      cr.register('bloco', {
        description: 'Minera o bloco que o bot esta olhando',
        usage: `${prefix}bloco`,
        category: 'mineracao',
        aliases: ['dig', 'quebrar'],
        execute: () => {
          const block = bot.blockAtCursor(4);
          if (!block || block.type === 0) {
            bot.chat('Nenhum bloco encontrado no alvo.');
            return;
          }
          mineBlock(block);
          bot.chat(`Minerando ${block.name}...`);
        }
      });
    }

    // ==================== METODOS PUBLICOS ====================
    context.mining = {
      findOres,
      findNearestOre,
      mineBlock,
      setAutoMine,
      countOres,
      isInventoryFull,
      getOreTypes: () => oreTypes,
      isAutoMining: () => miningEnabled
    };

    context.logger.info('Modulo de mineracao inicializado.');
  },

  onEnable: () => {},
  onDisable: () => {}
};
