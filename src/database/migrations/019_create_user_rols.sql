CREATE TABLE user_roles (
  user_id BIGINT NOT NULL,
  role_id SMALLINT NOT NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT user_roles_pk
    PRIMARY KEY (user_id, role_id),

  CONSTRAINT user_roles_user_fk
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE CASCADE,

  CONSTRAINT user_roles_role_fk
    FOREIGN KEY (role_id)
    REFERENCES roles(id)
    ON DELETE CASCADE
)