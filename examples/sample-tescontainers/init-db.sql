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
values ('Do the dishes', true),
  ('Walk the dogs', false),
  ('Buy Groceries', false),
  ('Wash the cars', false),
  ('Pay due bills', true);