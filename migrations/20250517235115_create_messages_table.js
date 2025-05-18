/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('messages', function(table) {
    table.string('id').primary();
    table.string('fromJid');
    table.text('body');
    table.integer('timestamp');
    table.string('mediaPath');
    table.string('mediaType');
    table.boolean('isViewOnce').defaultTo(false);
    table.boolean('processed').defaultTo(false);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('messages');
};
