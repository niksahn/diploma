-- Complete initial schema based on original Laba5.ddl + backend code requirements
-- Combines: base schema + refresh_tokens + tariffs as VARCHAR + complaint status fields
--
-- Do not DROP SCHEMA public here: golang-migrate stores version state in
-- public.schema_migrations; dropping public would remove that table mid-run.

-- Core tables
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  login VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(100) NOT NULL,
  status INT NOT NULL,
  surname VARCHAR(40) NOT NULL,
  name VARCHAR(40) NOT NULL,
  patronymic VARCHAR(40)
);

CREATE TABLE administrators (
  id SERIAL PRIMARY KEY,
  login VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(100) NOT NULL
);

CREATE TABLE tariffs (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description VARCHAR(500) NOT NULL UNIQUE
);

CREATE TABLE workspaces (
  id SERIAL PRIMARY KEY,
  creator INT NOT NULL,
  tariffsid INT NOT NULL,
  name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE chats (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  type INT NOT NULL,
  workspacesid INT NOT NULL
);

CREATE TABLE tasks (
  id SERIAL PRIMARY KEY,
  creator INT NOT NULL,
  workspacesid INT NOT NULL,
  title VARCHAR(100) NOT NULL,
  description VARCHAR(500),
  date DATE NOT NULL,
  status INT NOT NULL
);

CREATE TABLE complaints (
  id SERIAL PRIMARY KEY,
  text VARCHAR(255) NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  devicedescription VARCHAR(255) NOT NULL,
  author INT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'resolved', 'rejected')),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  author_email VARCHAR(255)
);

CREATE TABLE messages (
  id SERIAL PRIMARY KEY,
  chatsid INT NOT NULL,
  usersid INT NOT NULL,
  text VARCHAR(1000) NOT NULL,
  date INT NOT NULL,
  status VARCHAR(5000) NOT NULL
);

-- Junction tables
CREATE TABLE userinworkspace (
  usersid INT NOT NULL,
  workspacesid INT NOT NULL,
  role INT NOT NULL,
  date DATE NOT NULL,
  PRIMARY KEY (usersid, workspacesid)
);

CREATE TABLE userinchat (
  id SERIAL PRIMARY KEY,
  role INT NOT NULL,
  date DATE NOT NULL,
  chatsid INT NOT NULL,
  usersid INT NOT NULL
);

CREATE TABLE taskinchat (
  id SERIAL PRIMARY KEY,
  chatsid INT NOT NULL,
  tasksid INT NOT NULL
);

CREATE TABLE taskchanges (
  id SERIAL PRIMARY KEY,
  description VARCHAR(1000) NOT NULL,
  tasksid INT NOT NULL
);

CREATE TABLE userintask (
  id SERIAL PRIMARY KEY,
  tasksid INT NOT NULL,
  usersid INT NOT NULL
);

-- Additional tables from backend requirements
CREATE TABLE refresh_tokens (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  token VARCHAR(500) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  revoked BOOLEAN DEFAULT FALSE,
  role VARCHAR(20) NOT NULL DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE complaint_status_history (
  id SERIAL PRIMARY KEY,
  complaint_id INT NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'in_progress', 'resolved', 'rejected')),
  comment VARCHAR(500),
  changed_by INT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_users_login ON users(login);
CREATE INDEX idx_messages_chatsid ON messages(chatsid);
CREATE INDEX idx_messages_usersid ON messages(usersid);
CREATE INDEX idx_chats_workspacesid ON chats(workspacesid);
CREATE INDEX idx_workspaces_creator ON workspaces(creator);
CREATE INDEX idx_workspaces_tariffsid ON workspaces(tariffsid);
CREATE INDEX idx_tasks_creator ON tasks(creator);
CREATE INDEX idx_tasks_workspacesid ON tasks(workspacesid);
CREATE INDEX idx_complaints_author ON complaints(author);
CREATE INDEX idx_complaints_status ON complaints(status);
CREATE INDEX idx_complaints_author_email ON complaints(author_email);
CREATE INDEX idx_userinworkspace_usersid ON userinworkspace(usersid);
CREATE INDEX idx_userinworkspace_workspacesid ON userinworkspace(workspacesid);
CREATE INDEX idx_userinchat_chatsid ON userinchat(chatsid);
CREATE INDEX idx_userinchat_usersid ON userinchat(usersid);
CREATE INDEX idx_taskinchat_chatsid ON taskinchat(chatsid);
CREATE INDEX idx_taskinchat_tasksid ON taskinchat(tasksid);
CREATE INDEX idx_taskchanges_tasksid ON taskchanges(tasksid);
CREATE INDEX idx_userintask_tasksid ON userintask(tasksid);
CREATE INDEX idx_userintask_usersid ON userintask(usersid);
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
CREATE INDEX idx_complaint_status_history_complaint_id ON complaint_status_history(complaint_id);

-- Foreign keys
ALTER TABLE workspaces ADD CONSTRAINT fk_workspaces_creator FOREIGN KEY (creator) REFERENCES administrators(id);
ALTER TABLE workspaces ADD CONSTRAINT fk_workspaces_tariffsid FOREIGN KEY (tariffsid) REFERENCES tariffs(id);
ALTER TABLE chats ADD CONSTRAINT fk_chats_workspacesid FOREIGN KEY (workspacesid) REFERENCES workspaces(id);
ALTER TABLE tasks ADD CONSTRAINT fk_tasks_creator FOREIGN KEY (creator) REFERENCES users(id);
ALTER TABLE tasks ADD CONSTRAINT fk_tasks_workspacesid FOREIGN KEY (workspacesid) REFERENCES workspaces(id);
ALTER TABLE complaints ADD CONSTRAINT fk_complaints_author FOREIGN KEY (author) REFERENCES users(id);
ALTER TABLE messages ADD CONSTRAINT fk_messages_chatsid FOREIGN KEY (chatsid) REFERENCES chats(id);
ALTER TABLE messages ADD CONSTRAINT fk_messages_usersid FOREIGN KEY (usersid) REFERENCES users(id);
ALTER TABLE userinworkspace ADD CONSTRAINT fk_userinworkspace_users FOREIGN KEY (usersid) REFERENCES users(id);
ALTER TABLE userinworkspace ADD CONSTRAINT fk_userinworkspace_workspaces FOREIGN KEY (workspacesid) REFERENCES workspaces(id);
ALTER TABLE userinchat ADD CONSTRAINT fk_userinchat_chats FOREIGN KEY (chatsid) REFERENCES chats(id);
ALTER TABLE userinchat ADD CONSTRAINT fk_userinchat_users FOREIGN KEY (usersid) REFERENCES users(id);
ALTER TABLE taskinchat ADD CONSTRAINT fk_taskinchat_chats FOREIGN KEY (chatsid) REFERENCES chats(id);
ALTER TABLE taskinchat ADD CONSTRAINT fk_taskinchat_tasks FOREIGN KEY (tasksid) REFERENCES tasks(id);
ALTER TABLE taskchanges ADD CONSTRAINT fk_taskchanges_tasks FOREIGN KEY (tasksid) REFERENCES tasks(id);
ALTER TABLE userintask ADD CONSTRAINT fk_userintask_tasks FOREIGN KEY (tasksid) REFERENCES tasks(id);
ALTER TABLE userintask ADD CONSTRAINT fk_userintask_users FOREIGN KEY (usersid) REFERENCES users(id);
ALTER TABLE refresh_tokens ADD CONSTRAINT fk_refresh_tokens_user FOREIGN KEY (user_id) REFERENCES users(id);
ALTER TABLE complaint_status_history ADD CONSTRAINT fk_complaint_status_history_complaint FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE;
