# Using AVA with testcontainers

In order to extend test boundaries, one can use [testcontainers][testcontainers]
to provision services locally and evolve unit tests into integration tests while
avoiding the use of too much [mocks][sinon].

## Dependencies

- [ava 6][ava]
- [test containers postgresql plugin 10][tc-postgres]
- [knex 3][knex]
- [pg 8][pg]
- [dotenv-flow 4][dotenv]
- [docker 25 or newer properly configured][docker]

## Setup

```bash
mkdir sample-testcontainers
cd sample-testcontainers
npm init -y
npm i knex pg dotenv-flow
npm i -D ava @testcontainers/postgresql
touch example.js example.spec.js init-db.sql .env README.md .gitignore
```

The whole point of provision a database for testing is to know the db state, so
there is a init script:

```sql
-- init-db.sql script for our todo list

-- our table
create table if not exists todos(
  id serial primary key,
  description text not null,
  is_done boolean not null default false,
  created_at timestamp not null default current_timestamp,
  updated_at timestamp not null default current_timestamp  
);

-- some test values

insert into todos(description, is_done)
values  ('Do the dishes', true),
        ('Walk the dogs', false),
        ('Buy Groceries', false),
        ('Wash the cars', false),
        ('Pay due bills', true);
```

Then you can prepare a database instance for the test suite using `before` and
`after` [test hooks][test-setup-hooks]:

```javascript
// some imports

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
  // proper cleanup after all test cases
  await t.context.db.destroy();
  await t.context.postgres.stop({ timeout: 500 });
})

// some test cases

test("should list using 'ilike'", async t => {
  const todos = await t.context.db('todos').whereILike("description", "%do%")
  t.truthy(todos)
  t.is(2, todos.length)
  t.truthy(todos.find(todo => todo.description == "Do the dishes"))
})

```

## Sample run

```bash
$ npm run test

> examples@1.0.0 test
> ava --node-arguments '-r dotenv-flow/config' example.spec.js

  ⚠ Using configuration from /home/sombriks/git/ava/ava.config.js

  ✔ should list todos
  ✔ should list using 'ilike'
  ─

  2 tests passed
```

## Further reading

- [Example project][example]

[testcontainers]: https://testcontainers.com/
[sinon]: https://sinonjs.org/
[ava]: https://avajs.dev/
[tc-postgres]: https://node.testcontainers.org/modules/postgresql/
[knex]: https://knexjs.org/
[pg]: https://node-postgres.com/
[dotenv]: https://github.com/kerimdzhanov/dotenv-flow
[docker]: https://docs.docker.com/engine/install/
[example]: ../../examples/sample-tescontainers/README.md
[test-setup-hooks]: ../../docs/01-writing-tests.md
