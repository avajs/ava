import Knex from "knex"

export const provisionDb = (connection) => {
  if (!connection) {
    const { PG_DATABASE, PG_HOSTNAME, PG_PORT, PG_USERNAME, PG_PASSWORD } = process.env
    connection = `postgresql://${PG_USERNAME}:${PG_PASSWORD}@${PG_HOSTNAME}:${PG_PORT}/${PG_DATABASE}$`
  }
  return Knex({
    connection,
    client: 'pg'
  })
}
