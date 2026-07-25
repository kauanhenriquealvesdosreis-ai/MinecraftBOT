/**
 * commandRegistry.js - Registro central de comandos
 *
 * Gerencia o registro, execucao e ajuda de comandos
 * do bot. Comandos podem ser registrados por qualquer modulo.
 */

module.exports = {
  name: 'commandRegistry',
  description: 'Registro central de comandos do bot',
  category: 'core',

  init: (bot, context) => {
    const commands = new Map();
    const commandAliases = new Map();

    /**
     * Registra um novo comando
     * @param {string} name - Nome do comando
     * @param {Object} options - Opcoes do comando
     * @param {string} options.description - Descricao do comando
     * @param {string[]} options.aliases - Aliases do comando
     * @param {Function} options.execute - Funcao de execucao
     * @param {string} options.usage - Uso do comando
     * @param {string} options.permission - Permissao necessaria
     */
    function register(name, options) {
      if (commands.has(name)) {
        context.logger.warn(`Comando "${name}" ja registrado. Sobrescrevendo.`);
      }

      const cmd = {
        name,
        description: options.description || 'Sem descricao',
        aliases: options.aliases || [],
        execute: options.execute,
        usage: options.usage || `!${name}`,
        permission: options.permission || 'user',
        category: options.category || 'geral'
      };

      commands.set(name, cmd);

      // Registra aliases
      for (const alias of cmd.aliases) {
        commandAliases.set(alias, name);
      }

      context.logger.debug(`Comando registrado: ${name} (${cmd.aliases.length} aliases)`);
    }

    /**
     * Remove um comando
     * @param {string} name - Nome do comando
     */
    function unregister(name) {
      const cmd = commands.get(name);
      if (cmd) {
        for (const alias of cmd.aliases) {
          commandAliases.delete(alias);
        }
      }
      commands.delete(name);
      context.logger.info(`Comando "${name}" removido.`);
    }

    /**
     * Executa um comando
     * @param {string} name - Nome do comando
     * @param {Array} args - Argumentos
     * @param {string} username - Usuario que enviou
     * @param {string} message - Mensagem original
     */
    function execute(name, args, username, message) {
      // Resolve alias
      const cmdName = commandAliases.get(name) || name;
      const cmd = commands.get(cmdName);

      if (!cmd) {
        context.logger.debug(`Comando desconhecido: ${name}`);
        return false;
      }

      try {
        cmd.execute(args, username, message, bot, context);
        return true;
      } catch (e) {
        context.logger.error(`Erro ao executar comando "${cmdName}":`, e.message);
        bot.chat(`Erro ao executar comando: ${e.message}`);
        return false;
      }
    }

    /**
     * Obtem um comando pelo nome
     * @param {string} name - Nome do comando
     * @returns {Object|null} Comando
     */
    function get(name) {
      const cmdName = commandAliases.get(name) || name;
      return commands.get(cmdName) || null;
    }

    /**
     * Lista todos os comandos
     * @returns {Array} Lista de comandos
     */
    function list() {
      return Array.from(commands.values());
    }

    /**
     * Obtem ajuda para um comando
     * @param {string} name - Nome do comando
     * @returns {string} Texto de ajuda
     */
    function help(name) {
      const cmd = get(name);
      if (!cmd) return `Comando "${name}" nao encontrado.`;

      let helpText = `Comando: ${cmd.name}\n`;
      helpText += `Descricao: ${cmd.description}\n`;
      helpText += `Uso: ${cmd.usage}\n`;
      if (cmd.aliases.length > 0) {
        helpText += `Aliases: ${cmd.aliases.join(', ')}\n`;
      }
      helpText += `Categoria: ${cmd.category}`;
      return helpText;
    }

    /**
     * Lista todos os comandos por categoria
     * @returns {Object} Comandos agrupados por categoria
     */
    function listByCategory() {
      const categories = {};
      for (const cmd of commands.values()) {
        if (!categories[cmd.category]) {
          categories[cmd.category] = [];
        }
        categories[cmd.category].push(cmd);
      }
      return categories;
    }

    // Adiciona ao contexto
    context.commandRegistry = {
      register,
      unregister,
      execute,
      get,
      list,
      help,
      listByCategory
    };

    context.logger.info('CommandRegistry inicializado.');
  },

  onEnable: () => {},
  onDisable: () => {}
};
