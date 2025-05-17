const path = require('path');

/**
 * @type { Object.<string, import("knex").Knex.Config> }
 */
module.exports = {
  development: {
    client: 'sqlite3',
    connection: {
      filename: path.resolve(__dirname, 'data/messages.db')
    },
    useNullAsDefault: true,
    migrations: {
      directory: path.resolve(__dirname, 'migrations')
    }
  }
};
