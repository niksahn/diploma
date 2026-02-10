-- Rollback initial schema: drop tables in reverse dependency order

ALTER TABLE userintask DROP CONSTRAINT IF EXISTS fk_userintask_users;
ALTER TABLE userintask DROP CONSTRAINT IF EXISTS fk_userintask_tasks;
ALTER TABLE taskchanges DROP CONSTRAINT IF EXISTS fk_taskchanges_tasks;
ALTER TABLE taskinchat DROP CONSTRAINT IF EXISTS fk_taskinchat_tasks;
ALTER TABLE taskinchat DROP CONSTRAINT IF EXISTS fk_taskinchat_chats;
ALTER TABLE userinchat DROP CONSTRAINT IF EXISTS fk_userinchat_users;
ALTER TABLE userinchat DROP CONSTRAINT IF EXISTS fk_userinchat_chats;
ALTER TABLE userinworkspace DROP CONSTRAINT IF EXISTS fk_userinworkspace_workspaces;
ALTER TABLE userinworkspace DROP CONSTRAINT IF EXISTS fk_userinworkspace_users;
ALTER TABLE messages DROP CONSTRAINT IF EXISTS fk_messages_usersid;
ALTER TABLE messages DROP CONSTRAINT IF EXISTS fk_messages_chatsid;
ALTER TABLE complaints DROP CONSTRAINT IF EXISTS fk_complaints_author;
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS fk_tasks_workspacesid;
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS fk_tasks_creator;
ALTER TABLE chats DROP CONSTRAINT IF EXISTS fk_chats_workspacesid;
ALTER TABLE workspaces DROP CONSTRAINT IF EXISTS fk_workspaces_tariffsid;
ALTER TABLE workspaces DROP CONSTRAINT IF EXISTS fk_workspaces_creator;

DROP TABLE IF EXISTS userintask;
DROP TABLE IF EXISTS taskchanges;
DROP TABLE IF EXISTS taskinchat;
DROP TABLE IF EXISTS userinchat;
DROP TABLE IF EXISTS userinworkspace;
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS complaints;
DROP TABLE IF EXISTS tasks;
DROP TABLE IF EXISTS chats;
DROP TABLE IF EXISTS workspaces;
DROP TABLE IF EXISTS tariffs;
DROP TABLE IF EXISTS administrators;
DROP TABLE IF EXISTS users;
