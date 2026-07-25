/**
 * building.js - Modulo de construcao automatica
 *
 * Fornece funcionalidades para construir estruturas,
 * colocar blocos e criar formas geometricas.
 */

module.exports = {
  name: 'building',
  description: 'Modulo de construcao automatica de estruturas e blocos',
  category: 'module',

  init: (bot, context) => {
    const buildQueue = [];
    let buildingEnabled = false;

    // ==================== FUNCOES DE CONSTRUCAO ====================
    /**
     * Coloca um bloco em uma posicao
     * @param {Object} block - Bloco alvo (o bloco adjacente onde colocar)
     * @param {Object} item - Item a colocar
     */
    function placeBlock(block, item) {
      if (!block || !item) return false;

      return new Promise((resolve) => {
        bot.equip(item, 'hand', (err) => {
          if (err) {
            context.logger.error('Building: Erro ao equipar item:', err.message);
            resolve(false);
            return;
          }

          bot.activateBlock(block, (err) => {
            if (err) {
              context.logger.error('Building: Erro ao colocar bloco:', err.message);
              resolve(false);
              return;
            }
            resolve(true);
          });
        });
      });
    }

    /**
     * Encontra blocos para construir
     * @param {string} blockName - Nome do bloco
     * @param {number} radius - Raio de busca
     * @returns {Array} Blocos encontrados
     */
    function findBuildBlocks(blockName, radius = 32) {
      if (!context.helpers) return [];
      return context.helpers.findBlocks(blockName, radius);
    }

    /**
     * Constroi um quadrado/circulo de blocos
     * @param {number} x - Centro X
     * @param {number} y - Centro Y
     * @param {number} z - Centro Z
     * @param {number} radius - Raio
     * @param {string} blockName - Nome do bloco
     * @param {boolean} filled - Se preenchido
     */
    async function buildCircle(x, y, z, radius, blockName, filled = false) {
      const positions = [];

      for (let dx = -radius; dx <= radius; dx++) {
        for (let dz = -radius; dz <= radius; dz++) {
          const dist = Math.sqrt(dx * dx + dz * dz);
          if (filled ? dist <= radius : dist <= radius && dist > radius - 1) {
            positions.push({ x: x + dx, y, z: z + dz });
          }
        }
      }

      let placed = 0;
      for (const pos of positions) {
        const block = bot.blockAt(Math.floor(pos.x), Math.floor(pos.y), Math.floor(pos.z));
        if (block && block.type === 0) {
          const item = bot.inventory.items().find(i => i.name === blockName);
          if (item) {
            await placeBlock(block, item);
            placed++;
          }
        }
      }

      return placed;
    }

    /**
     * Constroi uma parede reta
     * @param {number} x1 - Inicio X
     * @param {number} y1 - Inicio Y
     * @param {number} z1 - Inicio Z
     * @param {number} x2 - Fim X
     * @param {number} y2 - Fim Y
     * @param {number} z2 - Fim Z
     * @param {string} blockName - Nome do bloco
     */
    async function buildWall(x1, y1, z1, x2, y2, z2, blockName) {
      const positions = [];
      const steps = Math.max(
        Math.abs(x2 - x1),
        Math.abs(y2 - y1),
        Math.abs(z2 - z1)
      );

      for (let i = 0; i <= steps; i++) {
        const t = steps === 0 ? 0 : i / steps;
        positions.push({
          x: Math.round(x1 + (x2 - x1) * t),
          y: Math.round(y1 + (y2 - y1) * t),
          z: Math.round(z1 + (z2 - z1) * t)
        });
      }

      let placed = 0;
      for (const pos of positions) {
        const block = bot.blockAt(pos.x, pos.y, pos.z);
        if (block && block.type === 0) {
          const item = bot.inventory.items().find(i => i.name === blockName);
          if (item) {
            await placeBlock(block, item);
            placed++;
          }
        }
      }

      return placed;
    }

    /**
     * Coloca blocos do inventario em volta do bot
     * @param {string} blockName - Nome do bloco
     * @param {number} radius - Raio
     */
    async function buildAround(blockName, radius = 3) {
      const center = { ...bot.entity.position };
      let placed = 0;

      for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -1; dy <= 2; dy++) {
          for (let dz = -radius; dz <= radius; dz++) {
            if (dx === 0 && dy === 0 && dz === 0) continue;

            const pos = {
              x: Math.floor(center.x + dx),
              y: Math.floor(center.y + dy),
              z: Math.floor(center.z + dz)
            };

            const block = bot.blockAt(pos.x, pos.y, pos.z);
            if (block && block.type === 0) {
              const item = bot.inventory.items().find(i => i.name === blockName);
              if (item) {
                await placeBlock(block, item);
                placed++;
              }
            }
          }
        }
      }

      return placed;
    }

    // ==================== REGISTRO DE COMANDOS ====================
    const prefix = context.chatHandler ? context.chatHandler.getPrefix() : '!';

    if (context.commandRegistry) {
      const cr = context.commandRegistry;

      cr.register('construir', {
        description: 'Constroi uma estrutura simples',
        usage: `${prefix}construir <tipo> [parametros]`,
        category: 'construcao',
        aliases: ['build', 'construir'],
        execute: async (args) => {
          const type = args[0];
          if (!type) {
            bot.chat(`${prefix}construir circulo <raio> <bloco> | parede <x1> <y1> <z1> <x2> <y2> <z2> <bloco> | emvolta <bloco>`);
            return;
          }

          if (type === 'circulo' || type === 'circle') {
            const radius = parseInt(args[1]) || 3;
            const blockName = args[2] || 'stone';
            bot.chat(`Construindo circulo de raio ${radius} com ${blockName}...`);
            const placed = await buildCircle(
              Math.floor(bot.entity.position.x),
              Math.floor(bot.entity.position.y),
              Math.floor(bot.entity.position.z),
              radius, blockName, false
            );
            bot.chat(`Construcao concluida! ${placed} blocos colocados.`);
          } else if (type === 'parede' || type === 'wall') {
            const x1 = parseInt(args[1]);
            const y1 = parseInt(args[2]);
            const z1 = parseInt(args[3]);
            const x2 = parseInt(args[4]);
            const y2 = parseInt(args[5]);
            const z2 = parseInt(args[6]);
            const blockName = args[7] || 'stone';
            if ([x1, y1, z1, x2, y2, z2].some(isNaN)) {
              bot.chat('Coordenadas invalidas.');
              return;
            }
            bot.chat(`Construindo parede...`);
            const placed = await buildWall(x1, y1, z1, x2, y2, z2, blockName);
            bot.chat(`Construcao concluida! ${placed} blocos colocados.`);
          } else if (type === 'emvolta' || type === 'around') {
            const blockName = args[1] || 'stone';
            bot.chat(`Construindo em volta...`);
            const placed = await buildAround(blockName, 3);
            bot.chat(`Construcao concluida! ${placed} blocos colocados.`);
          } else {
            bot.chat(`Tipo de construcao desconhecido: ${type}`);
          }
        }
      });

      cr.register('colocar', {
        description: 'Coloca um bloco no alvo',
        usage: `${prefix}colocar <bloco>`,
        category: 'construcao',
        aliases: ['place'],
        execute: async () => {
          const block = bot.blockAtCursor(4);
          if (!block) {
            bot.chat('Nenhum bloco alvo encontrado.');
            return;
          }
          const item = bot.inventory.items().find(i => i.name.includes('block') || i.name.includes('planks') || i.name === 'stone' || i.name === 'dirt');
          if (!item) {
            bot.chat('Nenhum bloco encontrado no inventario.');
            return;
          }
          const result = await placeBlock(block, item);
          bot.chat(result ? `Bloco colocado: ${item.name}` : 'Erro ao colocar bloco.');
        }
      });
    }

    // ==================== METODOS PUBLICOS ====================
    context.building = {
      placeBlock,
      findBuildBlocks,
      buildCircle,
      buildWall,
      buildAround
    };

    context.logger.info('Modulo de construcao inicializado.');
  },

  onEnable: () => {},
  onDisable: () => {}
};
