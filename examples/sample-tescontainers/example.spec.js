import { resolve } from "path"
import test from 'ava'
import { PostgreSqlContainer } from '@testcontainers/postgresql';

import { provisionDb } from './example.js'

test.before(async t => {
  // provision postgres
  t.context.postgres = await new PostgreSqlContainer('postgres:16.3-alpine3.20')
    .withDatabase(process.env.PG_DATABASE)
    .withUsername(process.env.PG_USERNAME)
    .withPassword(process.env.PG_PASSWORD)
    .withBindMounts([{
      source: resolve('./init-db.sql'),
      target: '/docker-entrypoint-initdb.d/init.sql',
    }])
    .start();

  // set query builder instance in test suite context
  t.context.db = provisionDb(t.context.postgres.getConnectionUri())
})

test.after.always(async t => {
  await t.context.db.destroy();
  await t.context.postgres.stop({ timeout: 500 });
})

test("should list todos", async t => {
  const todos = await t.context.db('todos')
  t.truthy(todos)
  t.is(5, todos.length)
})

test("should list using 'ilike'", async t => {
  const todos = await t.context.db('todos').whereILike("description", "%do%")
  t.truthy(todos)
  t.is(2, todos.length)
  t.truthy(todos.find(todo => todo.description == "Do the dishes"))
})