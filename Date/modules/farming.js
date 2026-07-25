/**
 * farming.js - Modulo de agricultura automatica
 *
 * Fornece funcionalidades para colher e plantar culturas,
 * incluindo trigo, cenouras, batatas e beterrabas.
 */

module.exports = {
  name: 'farming',
  description: 'Modulo de agricultura automatica - colheita e plantio',
  category: 'module',

  init: (bot, context) => {
    const config = context.config.farming || {};
    const cropTypes = config.cropTypes || ['wheat', 'carrots', 'potatoes', 'beetroots'];
    const autoHarvest = config.autoHarvest || false;
    const autoPlant = config.autoPlant !== false;

    let farmingEnabled = false;
    let farmingInterval = null;

    // Mapeamento de culturas para blocos de crescimento e colheita
    const cropData = {
      wheat: {
        crop: 'wheat',
        seed: 'wheat_seeds',
        farmland: 'farmland',
        growthStages: 8,
        matureBlock: 'wheat'
      },
      carrots: {
        crop: 'carrots',
        seed: 'carrot',
        farmland: 'farmland',
        growthStages: 7,
        matureBlock: 'carrots'
      },
      potatoes: {
        crop: 'potatoes',
        seed: 'potato',
        farmland: 'farmland',
        growthStages: 7,
        matureBlock: 'potatoes'
      },
      beetroots: {
        crop: 'beetroots',
        seed: 'beetroot_seeds',
        farmland: 'farmland',
        growthStages: 4,
        matureBlock: 'beetroots'
      }
    };

    // ==================== FUNCOES DE AGRICULTURA ====================
    /**
     * Encontra culturas prontas para colheita
     * @param {number} radius - Raio de busca
     * @returns {Array} Blocos de culturas prontas
     */
    function findReadyCrops(radius = 32) {
      const readyCrops = [];

      for (const cropType of cropTypes) {
        const data = cropData[cropType];
        if (!data) continue;

        // Encontra blocos de cultura
        const blocks = context.helpers ? context.helpers.findBlocks(data.crop, radius) : [];

        for (const pos of blocks) {
          const block = bot.blockAt(pos);
          if (!block || block.type === 0) continue;

          // Verifica se a cultura esta madura (age 7 ou 8)
          if (block.age !== undefined && block.age >= data.growthStages - 1) {
            readyCrops.push({
              block,
              type: cropType,
              data: data
            });
          }
        }
      }

      return readyCrops;
    }

    /**
     * Colheita uma cultura
     * @param {Object} crop - Objeto da cultura
     */
    function harvestCrop(crop) {
      const block = crop.block;
      const data = crop.data;

      // Quebra o bloco (colheita)
      bot.dig(block);

      // Planta novamente se autoPlant estiver ativado
      if (autoPlant && context.helpers) {
        const seedCount = context.helpers.countItem(data.seed);
        if (seedCount > 0) {
          // Aguarda um tick para o bloco ser quebrado
          setTimeout(() => {
            const farmland = bot.blockAt(block.position);
            if (farmland && farmland.name === data.farmland) {
              // Planta a semente
              const seeds = bot.inventory.items().find(i => i.name === data.seed);
              if (seeds) {
                bot.equip(seeds, 'hand', (err) => {
                  if (!err) {
                    bot.activateBlock(farmland);
                  }
                });
              }
            }
          }, 200);
        }
      }
    }

    /**
     * Ativa/desativa a agricultura automatica
     * @param {boolean} enabled - Se a agricultura deve estar ativa
     */
    function setAutoFarm(enabled) {
      farmingEnabled = enabled;

      if (farmingInterval) {
        clearInterval(farmingInterval);
        farmingInterval = null;
      }

      if (enabled) {
        farmingInterval = setInterval(() => {
          if (!context.navigation) return;
          if (context.navigation.isMoving()) return;

          const readyCrops = findReadyCrops(24);
          if (readyCrops.length > 0) {
            const crop = readyCrops[0];
            context.logger.debug(`Farming: Colhendo ${crop.type} em ${context.helpers.formatPosition(crop.block.position)}.`);
            context.navigation.goToBlock(crop.block, 2).then(() => {
              harvestCrop(crop);
            }).catch(e => {
              context.logger.debug(`Farming: Erro ao navegar: ${e.message}`);
            });
          }
        }, 3000);
        context.logger.info('Agricultura automatica ATIVADA.');
      } else {
        context.logger.info('Agricultura automatica DESATIVADA.');
      }
    }

    /**
     * Colheita todas as culturas prontas no raio
     * @param {number} radius - Raio de busca
     */
    function harvestAll(radius = 32) {
      const readyCrops = findReadyCrops(radius);
      let harvested = 0;

      for (const crop of readyCrops) {
        harvestCrop(crop);
        harvested++;
      }

      return harvested;
    }

    /**
     * Conta sementes no inventario
     * @returns {Object} Contagem por tipo de semente
     */
    function countSeeds() {
      const result = {};
      for (const cropType of cropTypes) {
        const data = cropData[cropType];
        if (data && context.helpers) {
          const count = context.helpers.countItem(data.seed);
          if (count > 0) {
            result[data.seed] = count;
          }
        }
      }
      return result;
    }

    // ==================== REGISTRO DE COMANDOS ====================
    const prefix = context.chatHandler ? context.chatHandler.getPrefix() : '!';

    if (context.commandRegistry) {
      const cr = context.commandRegistry;

      cr.register('farm', {
        description: 'Ativa/desativa a agricultura automatica',
        usage: `${prefix}farm [on/off]`,
        category: 'agricultura',
        aliases: ['agricultura', 'autoFarm'],
        execute: (args) => {
          if (args[0] === 'on' || args[0] === 'true' || args[0] === '1') {
            setAutoFarm(true);
            bot.chat('Agricultura automatica ATIVADA.');
          } else if (args[0] === 'off' || args[0] === 'false' || args[0] === '0') {
            setAutoFarm(false);
            bot.chat('Agricultura automatica DESATIVADA.');
          } else {
            setAutoFarm(!farmingEnabled);
            bot.chat(`Agricultura automatica ${farmingEnabled ? 'ATIVADA' : 'DESATIVADA'}.`);
          }
        }
      });

      cr.register('colher', {
        description: 'Colhe todas as culturas prontas no raio',
        usage: `${prefix}colher [raio]`,
        category: 'agricultura',
        aliases: ['harvest'],
        execute: (args) => {
          const radius = parseInt(args[0]) || 24;
          const count = harvestAll(radius);
          bot.chat(`Colhidas ${count} culturas.`);
        }
      });

      cr.register('sementes', {
        description: 'Lista as sementes disponiveis no inventario',
        usage: `${prefix}sementes`,
        category: 'agricultura',
        aliases: ['seeds'],
        execute: () => {
          const seeds = countSeeds();
          const keys = Object.keys(seeds);
          if (keys.length === 0) {
            bot.chat('Nenhuma semente encontrada no inventario.');
            return;
          }
          const summary = keys.map(k => `${k}: ${seeds[k]}`).join(', ');
          bot.chat(`Sementes: ${summary}`);
        }
      });
    }

    // ==================== METODOS PUBLICOS ====================
    context.farming = {
      findReadyCrops,
      harvestCrop,
      harvestAll,
      setAutoFarm,
      countSeeds,
      getCropTypes: () => cropTypes,
      isAutoFarming: () => farmingEnabled
    };

    context.logger.info('Modulo de agricultura inicializado.');
  },

  onEnable: () => {},
  onDisable: () => {}
};
