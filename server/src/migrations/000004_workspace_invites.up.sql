-- Ссылки-приглашения в рабочее пространство: руководитель создаёт одноразовую
-- ссылку с заданной ролью, сотрудник переходит по ней и присоединяется к РП.
-- Ссылка становится недействительной после первого использования (used_count >= 1).
CREATE TABLE workspace_invites (
  id SERIAL PRIMARY KEY,
  workspacesid INT NOT NULL,
  token VARCHAR(64) NOT NULL UNIQUE,
  role INT NOT NULL,
  created_by INT NOT NULL,
  used_count INT NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_workspace_invites_token ON workspace_invites(token);
CREATE INDEX idx_workspace_invites_workspacesid ON workspace_invites(workspacesid);

ALTER TABLE workspace_invites
  ADD CONSTRAINT fk_workspace_invites_workspace
  FOREIGN KEY (workspacesid) REFERENCES workspaces(id) ON DELETE CASCADE;

ALTER TABLE workspace_invites
  ADD CONSTRAINT fk_workspace_invites_created_by
  FOREIGN KEY (created_by) REFERENCES users(id);
