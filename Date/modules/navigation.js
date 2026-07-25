/**
 * navigation.js - Modulo de navegacao e pathfinding
 *
 * Fornece funcionalidades de navegacao automatica,
 * incluindo movimento, escalada, túneis e exploração.
 */

const { goals } = require('mineflayer-pathfinder');

module.exports = {
  name: 'navigation',
  description: 'Modulo de navegacao e pathfinding automatico',
  category: 'module',

  init: (bot, context) => {
    const config = context.config.navigation || {};
    const { GoalNear, GoalBlock, GoalFollow } = goals;

    // Configuracoes do pathfinding
    const mcData = require('minecraft-data')(bot);
    const defaultMove = bot.pathfinder;

    // Configura as opcoes de movimento
    if (config.allow1by1tunnel !== undefined) {
      defaultMove.allow1by1tunnel = config.allow1by1tunnel;
    }
    if (config.allow1by1hole !== undefined) {
      defaultMove.allow1by1hole = config.allow1by1hole;
    }
    if (config.allowDownward !== undefined) {
      defaultMove.allowDownward = config.allowDownward;
    }
    if (config.maxDropHeight !== undefined) {
      defaultMove.maxDropHeight = config.maxDropHeight;
    }

    let followTarget = null;
    let followInterval = null;

    // ==================== FUNCOES DE NAVEGACAO ====================
    /**
     * Navega ate uma posicao
     * @param {number} x - Coordenada X
     * @param {number} y - Coordenada Y
     * @param {number} z - Coordenada Z
     * @param {number} radius - Raio de chegada
     */
    async function goTo(x, y, z, radius = 1) {
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          bot.pathfinder.stop();
          reject(new Error('Timeout ao navegar ate a posicao.'));
        }, 30000);

        bot.pathfinder.setGoal(new GoalNear(x, y, z, radius), true);

        bot.on('physicTick', function check() {
          if (bot.pathfinder.isMoving()) {
            // Continua tentando
          } else {
            clearTimeout(timeout);
            bot.removeListener('physicTick', check);
            resolve(true);
          }
        });
      });
    }

    /**
     * Navega ate um bloco
     * @param {Object} block - Bloco alvo
     * @param {number} radius - Raio de chegada
     */
    async function goToBlock(block, radius = 3) {
      if (!block) throw new Error('Bloco invalido.');
      return goTo(block.position.x, block.position.y, block.position.z, radius);
    }

    /**
     * Para o movimento do bot
     */
    function stop() {
      bot.pathfinder.stop();
      if (followInterval) {
        clearInterval(followInterval);
        followInterval = null;
      }
      followTarget = null;
    }

    /**
     * Segue um jogador
     * @param {string} playerName - Nome do jogador
     */
    function followPlayer(playerName) {
      stop();
      followTarget = playerName;

      followInterval = setInterval(() => {
        const player = bot.players[playerName];
        if (player && player.type === 'player' && player.entity) {
          bot.pathfinder.setGoal(new GoalFollow(player.entity), true);
        } else {
          context.logger.warn(`Jogador "${playerName}" nao encontrado.`);
        }
      }, 1000);

      context.logger.info(`Navegacao: Seguindo jogador "${playerName}".`);
    }

    /**
     * Explora a area ao redor do bot
     * @param {number} radius - Raio de exploracao
     */
    async function explore(radius = 64) {
      const center = { ...bot.entity.position };
      const angle = Math.random() * Math.PI * 2;
      const distance = radius * 0.8;
      const targetX = center.x + Math.cos(angle) * distance;
      const targetZ = center.z + Math.sin(angle) * distance;

      // Encontra a altura do terreno
      const block = bot.blockAt(Math.floor(targetX), Math.floor(center.y), Math.floor(targetZ));
      const targetY = block.position.y + 1;

      return goTo(targetX, targetY, targetZ, 2);
    }

    /**
     * Retorna a posicao atual do bot
     * @returns {Object} Posicao
     */
    function getPosition() {
      return bot.entity.position;
    }

    /**
     * Verifica se o bot esta se movendo
     * @returns {boolean}
     */
    function isMoving() {
      return bot.pathfinder.isMoving();
    }

    // ==================== REGISTRO DE COMANDOS ====================
    const prefix = context.chatHandler ? context.chatHandler.getPrefix() : '!';

    if (context.commandRegistry) {
      const cr = context.commandRegistry;

      cr.register('ir', {
        description: 'Navega ate as coordenadas especificadas',
        usage: `${prefix}ir <x> <y> <z>`,
        category: 'navegacao',
        aliases: ['goto', 'navegar'],
        execute: async (args, username) => {
          if (args.length < 3) {
            bot.chat(`${prefix}ir <x> <y> <z> - Navega ate as coordenadas.`);
            return;
          }
          const x = parseInt(args[0]);
          const y = parseInt(args[1]);
          const z = parseInt(args[2]);
          if (isNaN(x) || isNaN(y) || isNaN(z)) {
            bot.chat('Coordenadas invalidas.');
            return;
          }
          bot.chat(`Navegando ate ${x}, ${y}, ${z}...`);
          try {
            await goTo(x, y, z);
            bot.chat('Cheguei ao destino!');
          } catch (e) {
            bot.chat(`Erro ao navegar: ${e.message}`);
          }
        }
      });

      cr.register('parar', {
        description: 'Para o movimento do bot',
        usage: `${prefix}parar`,
        category: 'navegacao',
        aliases: ['stop'],
        execute: () => {
          stop();
          bot.chat('Movimento parado.');
        }
      });

      cr.register('seguir', {
        description: 'Segue um jogador',
        usage: `${prefix}seguir <jogador>`,
        category: 'navegacao',
        aliases: ['follow'],
        execute: (args) => {
          if (!args[0]) {
            bot.chat(`${prefix}seguir <jogador> - Segue o jogador especificado.`);
            return;
          }
          followPlayer(args[0]);
          bot.chat(`Seguindo ${args[0]}...`);
        }
      });

      cr.register('explorar', {
        description: 'Explora a area ao redor',
        usage: `${prefix}explorar [raio]`,
        category: 'navegacao',
        aliases: ['explore'],
        execute: async (args) => {
          const radius = parseInt(args[0]) || 64;
          bot.chat(`Explorando area com raio ${radius}...`);
          try {
            await explore(radius);
            bot.chat('Exploracao concluida!');
          } catch (e) {
            bot.chat(`Erro na exploracao: ${e.message}`);
          }
        }
      });
    }

    // ==================== EVENTOS ====================
    bot.on('chat', (username, message) => {
      // Processamento adicional de chat para navegacao
    });

    // Adiciona ao contexto
    context.navigation = {
      goTo,
      goToBlock,
      stop,
      followPlayer,
      explore,
      getPosition,
      isMoving
    };

    context.logger.info('Modulo de navegacao inicializado.');
  },

  onEnable: () => {},
  onDisable: () => {}
};
