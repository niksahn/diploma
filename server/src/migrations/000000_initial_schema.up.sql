-- Initial schema (first version of the database)
-- Source: Laba5.ddl
-- Idempotent: safe to run when tables already exist (e.g. existing DB).

-- Core tables (no FK dependencies)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL NOT NULL,
  login varchar(50) NOT NULL,
  password varchar(100) NOT NULL,
  status int4 NOT NULL,
  surname varchar(40) NOT NULL,
  name varchar(40) NOT NULL,
  patronymic varchar(40),
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS administrators (
  id SERIAL NOT NULL,
  login varchar(100) NOT NULL,
  password varchar(100) NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS tariffs (
  id SERIAL NOT NULL,
  name int4 NOT NULL,
  description int4 NOT NULL,
  PRIMARY KEY (id)
);

-- Tables depending on users, administrators, tariffs
CREATE TABLE IF NOT EXISTS workspaces (
  id SERIAL NOT NULL,
  creator int4 NOT NULL,
  tariffsid int4 NOT NULL,
  name varchar(100) NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS chats (
  id SERIAL NOT NULL,
  name varchar(100) NOT NULL,
  type int4 NOT NULL,
  workspacesid int4 NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL NOT NULL,
  creator int4 NOT NULL,
  workspacesid int4 NOT NULL,
  title varchar(100) NOT NULL,
  description varchar(500),
  "date" date NOT NULL,
  status int4 NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS complaints (
  id SERIAL NOT NULL,
  text varchar(255) NOT NULL,
  "date" date NOT NULL,
  devicedescription varchar(255) NOT NULL,
  author int4 NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS messages (
  id SERIAL NOT NULL,
  chatsid int4 NOT NULL,
  usersid int4 NOT NULL,
  text varchar(1000) NOT NULL,
  "date" int4 NOT NULL,
  status varchar(5000) NOT NULL,
  PRIMARY KEY (id)
);

-- Junction / relation tables
CREATE TABLE IF NOT EXISTS userinworkspace (
  usersid int4 NOT NULL,
  workspacesid int4 NOT NULL,
  role int4 NOT NULL,
  "date" date NOT NULL,
  PRIMARY KEY (usersid, workspacesid)
);

CREATE TABLE IF NOT EXISTS userinchat (
  id SERIAL NOT NULL,
  role int4 NOT NULL,
  "date" date NOT NULL,
  chatsid int4 NOT NULL,
  usersid int4 NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS taskinchat (
  id SERIAL NOT NULL,
  chatsid int4 NOT NULL,
  tasksid int4 NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS taskchanges (
  id SERIAL NOT NULL,
  description varchar(1000) NOT NULL,
  tasksid int4 NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS userintask (
  id SERIAL NOT NULL,
  tasksid int4 NOT NULL,
  usersid int4 NOT NULL,
  PRIMARY KEY (id)
);

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS users_login ON users (login);
CREATE INDEX IF NOT EXISTS messages_chatsid ON messages (chatsid);
CREATE INDEX IF NOT EXISTS messages_usersid ON messages (usersid);
CREATE INDEX IF NOT EXISTS chats_workspacesid ON chats (workspacesid);
CREATE INDEX IF NOT EXISTS workspaces_creator ON workspaces (creator);
CREATE INDEX IF NOT EXISTS workspaces_tariffsid ON workspaces (tariffsid);
CREATE UNIQUE INDEX IF NOT EXISTS workspaces_name ON workspaces (name);
CREATE INDEX IF NOT EXISTS tasks_creator ON tasks (creator);
CREATE INDEX IF NOT EXISTS tasks_workspacesid ON tasks (workspacesid);
CREATE UNIQUE INDEX IF NOT EXISTS administrators_login ON administrators (login);
CREATE INDEX IF NOT EXISTS complaints_author ON complaints (author);
CREATE UNIQUE INDEX IF NOT EXISTS tariffs_name ON tariffs (name);
CREATE UNIQUE INDEX IF NOT EXISTS tariffs_description ON tariffs (description);
CREATE INDEX IF NOT EXISTS userinworkspace_usersid ON userinworkspace (usersid);
CREATE INDEX IF NOT EXISTS userinworkspace_workspacesid ON userinworkspace (workspacesid);
CREATE INDEX IF NOT EXISTS userinchat_chatsid ON userinchat (chatsid);
CREATE INDEX IF NOT EXISTS userinchat_usersid ON userinchat (usersid);
CREATE INDEX IF NOT EXISTS taskinchat_chatsid ON taskinchat (chatsid);
CREATE INDEX IF NOT EXISTS taskinchat_tasksid ON taskinchat (tasksid);
CREATE INDEX IF NOT EXISTS taskchanges_tasksid ON taskchanges (tasksid);
CREATE INDEX IF NOT EXISTS userintask_tasksid ON userintask (tasksid);
CREATE INDEX IF NOT EXISTS userintask_usersid ON userintask (usersid);

-- Foreign keys (ignore if constraint already exists)
DO $$ BEGIN ALTER TABLE workspaces ADD CONSTRAINT fk_workspaces_creator FOREIGN KEY (creator) REFERENCES administrators (id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE workspaces ADD CONSTRAINT fk_workspaces_tariffsid FOREIGN KEY (tariffsid) REFERENCES tariffs (id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE chats ADD CONSTRAINT fk_chats_workspacesid FOREIGN KEY (workspacesid) REFERENCES workspaces (id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE tasks ADD CONSTRAINT fk_tasks_creator FOREIGN KEY (creator) REFERENCES users (id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE tasks ADD CONSTRAINT fk_tasks_workspacesid FOREIGN KEY (workspacesid) REFERENCES workspaces (id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE complaints ADD CONSTRAINT fk_complaints_author FOREIGN KEY (author) REFERENCES users (id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE messages ADD CONSTRAINT fk_messages_chatsid FOREIGN KEY (chatsid) REFERENCES chats (id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE messages ADD CONSTRAINT fk_messages_usersid FOREIGN KEY (usersid) REFERENCES users (id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE userinworkspace ADD CONSTRAINT fk_userinworkspace_users FOREIGN KEY (usersid) REFERENCES users (id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE userinworkspace ADD CONSTRAINT fk_userinworkspace_workspaces FOREIGN KEY (workspacesid) REFERENCES workspaces (id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE userinchat ADD CONSTRAINT fk_userinchat_chats FOREIGN KEY (chatsid) REFERENCES chats (id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE userinchat ADD CONSTRAINT fk_userinchat_users FOREIGN KEY (usersid) REFERENCES users (id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE taskinchat ADD CONSTRAINT fk_taskinchat_chats FOREIGN KEY (chatsid) REFERENCES chats (id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE taskinchat ADD CONSTRAINT fk_taskinchat_tasks FOREIGN KEY (tasksid) REFERENCES tasks (id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE taskchanges ADD CONSTRAINT fk_taskchanges_tasks FOREIGN KEY (tasksid) REFERENCES tasks (id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE userintask ADD CONSTRAINT fk_userintask_tasks FOREIGN KEY (tasksid) REFERENCES tasks (id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE userintask ADD CONSTRAINT fk_userintask_users FOREIGN KEY (usersid) REFERENCES users (id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
