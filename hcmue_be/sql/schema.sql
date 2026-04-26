-- ============================================================
-- HCMUE Enrollment Support — Full Database Schema
-- PostgreSQL 15+
-- Requires: pgcrypto or pg 13+ for gen_random_uuid()
-- ============================================================

-- ============================================================
-- SHARED ENUM TYPES
-- ============================================================

CREATE TYPE actions AS ENUM ('create', 'update', 'delete');
CREATE TYPE score_type_enum AS ENUM ('HOCBA', 'THPT', 'DGNL', 'CB');
CREATE TYPE admission_status_enum AS ENUM ('admitted', 'rejected', 'pending');
CREATE TYPE import_status_enum AS ENUM ('pending', 'processing', 'done', 'failed');


-- ============================================================
-- SERVICE: AUTH
-- Tables: account_type → account → staff
-- ============================================================

-- ------------------------------------------------------------
-- account_type
-- ------------------------------------------------------------
CREATE TABLE account_type (
    id            CHAR(4)      PRIMARY KEY,
    name          VARCHAR(50)  NOT NULL,
    description   TEXT         NULL,
    action        actions      DEFAULT 'create',
    field_changed VARCHAR(500) NULL,
    create_date   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    update_date   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE account_type_log (
    id              SERIAL       PRIMARY KEY,
    account_type_id CHAR(4)      REFERENCES account_type(id) ON DELETE CASCADE,
    name            VARCHAR(50)  NOT NULL,
    description     TEXT         NULL,
    action          actions      NOT NULL,
    field_changed   VARCHAR(500) NULL,
    create_date     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

CREATE OR REPLACE FUNCTION set_account_type()
RETURNS TRIGGER AS $$
DECLARE changed_fields TEXT := '';
BEGIN
    IF NEW.id          IS NOT NULL THEN changed_fields := changed_fields || 'id, ';          END IF;
    IF NEW.name        IS NOT NULL THEN changed_fields := changed_fields || 'name, ';        END IF;
    IF NEW.description IS NOT NULL THEN changed_fields := changed_fields || 'description, '; END IF;
    changed_fields := RTRIM(changed_fields, ', ');
    NEW.action        := 'create';
    NEW.field_changed := changed_fields;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_account_type
BEFORE INSERT ON account_type
FOR EACH ROW EXECUTE FUNCTION set_account_type();

CREATE OR REPLACE FUNCTION log_account_type()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO account_type_log (account_type_id, name, description, action, field_changed, create_date)
    VALUES (NEW.id, NEW.name, NEW.description, NEW.action, NEW.field_changed, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_log_account_type
AFTER INSERT ON account_type
FOR EACH ROW EXECUTE FUNCTION log_account_type();

CREATE OR REPLACE FUNCTION log_account_type_update()
RETURNS TRIGGER AS $$
DECLARE changed_fields TEXT := '';
BEGIN
    IF NEW.name        IS DISTINCT FROM OLD.name        THEN changed_fields := changed_fields || 'name, ';        END IF;
    IF NEW.description IS DISTINCT FROM OLD.description THEN changed_fields := changed_fields || 'description, '; END IF;
    changed_fields    := RTRIM(changed_fields, ', ');
    NEW.action        := 'update';
    NEW.field_changed := changed_fields;
    NEW.update_date   := NOW();
    INSERT INTO account_type_log (account_type_id, name, description, action, field_changed, create_date)
    VALUES (NEW.id, NEW.name, NEW.description, 'update', changed_fields, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_log_account_type_update
BEFORE UPDATE ON account_type
FOR EACH ROW EXECUTE FUNCTION log_account_type_update();


-- ------------------------------------------------------------
-- account
-- ------------------------------------------------------------
CREATE TABLE account (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    account_type_id CHAR(4)      NOT NULL REFERENCES account_type(id) ON DELETE RESTRICT,
    username        VARCHAR(150) NOT NULL UNIQUE,
    email           VARCHAR(254) NOT NULL UNIQUE,
    password_hash   VARCHAR(128) NOT NULL,
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    is_deleted      BOOLEAN      NOT NULL DEFAULT FALSE,
    deleted_at      TIMESTAMP    NULL,
    action          actions      DEFAULT 'create',
    field_changed   VARCHAR(500) NULL,
    create_date     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    update_date     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_account_username        ON account(username);
CREATE INDEX idx_account_account_type_id ON account(account_type_id);

CREATE TABLE account_log (
    id              SERIAL       PRIMARY KEY,
    account_id      UUID         REFERENCES account(id) ON DELETE CASCADE,
    account_type_id CHAR(4)      NULL,
    username        VARCHAR(150) NOT NULL,
    email           VARCHAR(254) NOT NULL,
    is_active       BOOLEAN      NOT NULL,
    is_deleted      BOOLEAN      NOT NULL,
    deleted_at      TIMESTAMP    NULL,
    action          actions      NOT NULL,
    field_changed   VARCHAR(500) NULL,
    create_date     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

CREATE OR REPLACE FUNCTION set_account()
RETURNS TRIGGER AS $$
DECLARE changed_fields TEXT := '';
BEGIN
    IF NEW.account_type_id IS NOT NULL THEN changed_fields := changed_fields || 'account_type_id, '; END IF;
    IF NEW.username        IS NOT NULL THEN changed_fields := changed_fields || 'username, ';        END IF;
    IF NEW.email           IS NOT NULL THEN changed_fields := changed_fields || 'email, ';           END IF;
    IF NEW.password_hash   IS NOT NULL THEN changed_fields := changed_fields || 'password_hash, ';  END IF;
    changed_fields    := RTRIM(changed_fields, ', ');
    NEW.action        := 'create';
    NEW.field_changed := changed_fields;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_account
BEFORE INSERT ON account
FOR EACH ROW EXECUTE FUNCTION set_account();

CREATE OR REPLACE FUNCTION log_account()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO account_log (account_id, account_type_id, username, email, is_active, is_deleted, deleted_at, action, field_changed, create_date)
    VALUES (NEW.id, NEW.account_type_id, NEW.username, NEW.email, NEW.is_active, NEW.is_deleted, NEW.deleted_at, NEW.action, NEW.field_changed, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_log_account
AFTER INSERT ON account
FOR EACH ROW EXECUTE FUNCTION log_account();

CREATE OR REPLACE FUNCTION log_account_update()
RETURNS TRIGGER AS $$
DECLARE
    changed_fields TEXT    := '';
    new_action     actions := 'update';
BEGIN
    IF NEW.account_type_id IS DISTINCT FROM OLD.account_type_id THEN changed_fields := changed_fields || 'account_type_id, '; END IF;
    IF NEW.username        IS DISTINCT FROM OLD.username        THEN changed_fields := changed_fields || 'username, ';        END IF;
    IF NEW.email           IS DISTINCT FROM OLD.email           THEN changed_fields := changed_fields || 'email, ';           END IF;
    IF NEW.password_hash   IS DISTINCT FROM OLD.password_hash   THEN changed_fields := changed_fields || 'password_hash, ';  END IF;
    IF NEW.is_active       IS DISTINCT FROM OLD.is_active       THEN changed_fields := changed_fields || 'is_active, ';       END IF;
    IF NEW.is_deleted      IS DISTINCT FROM OLD.is_deleted THEN
        changed_fields := changed_fields || 'is_deleted, ';
        IF NEW.is_deleted = TRUE THEN
            new_action     := 'delete';
            NEW.deleted_at := NOW();
        END IF;
    END IF;
    changed_fields    := RTRIM(changed_fields, ', ');
    NEW.action        := new_action;
    NEW.field_changed := changed_fields;
    NEW.update_date   := NOW();
    INSERT INTO account_log (account_id, account_type_id, username, email, is_active, is_deleted, deleted_at, action, field_changed, create_date)
    VALUES (NEW.id, NEW.account_type_id, NEW.username, NEW.email, NEW.is_active, NEW.is_deleted, NEW.deleted_at, new_action, changed_fields, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_log_account_update
BEFORE UPDATE ON account
FOR EACH ROW EXECUTE FUNCTION log_account_update();


-- ------------------------------------------------------------
-- staff
-- ------------------------------------------------------------
CREATE TABLE staff (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id    UUID         NULL UNIQUE REFERENCES account(id) ON DELETE SET NULL,
    name          VARCHAR(200) NOT NULL,
    employee_id   VARCHAR(20)  NULL UNIQUE,
    action        actions      DEFAULT 'create',
    field_changed VARCHAR(500) NULL,
    create_date   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    update_date   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE staff_log (
    id          SERIAL       PRIMARY KEY,
    staff_id    UUID         REFERENCES staff(id) ON DELETE CASCADE,
    account_id  UUID         NULL,
    name        VARCHAR(200) NOT NULL,
    employee_id VARCHAR(20)  NULL,
    action      actions      NOT NULL,
    field_changed VARCHAR(500) NULL,
    create_date TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

CREATE OR REPLACE FUNCTION set_staff()
RETURNS TRIGGER AS $$
DECLARE changed_fields TEXT := '';
BEGIN
    IF NEW.account_id  IS NOT NULL THEN changed_fields := changed_fields || 'account_id, ';  END IF;
    IF NEW.name        IS NOT NULL THEN changed_fields := changed_fields || 'name, ';        END IF;
    IF NEW.employee_id IS NOT NULL THEN changed_fields := changed_fields || 'employee_id, '; END IF;
    changed_fields    := RTRIM(changed_fields, ', ');
    NEW.action        := 'create';
    NEW.field_changed := changed_fields;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_staff
BEFORE INSERT ON staff
FOR EACH ROW EXECUTE FUNCTION set_staff();

CREATE OR REPLACE FUNCTION log_staff()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO staff_log (staff_id, account_id, name, employee_id, action, field_changed, create_date)
    VALUES (NEW.id, NEW.account_id, NEW.name, NEW.employee_id, NEW.action, NEW.field_changed, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_log_staff
AFTER INSERT ON staff
FOR EACH ROW EXECUTE FUNCTION log_staff();

CREATE OR REPLACE FUNCTION log_staff_update()
RETURNS TRIGGER AS $$
DECLARE changed_fields TEXT := '';
BEGIN
    IF NEW.account_id  IS DISTINCT FROM OLD.account_id  THEN changed_fields := changed_fields || 'account_id, ';  END IF;
    IF NEW.name        IS DISTINCT FROM OLD.name        THEN changed_fields := changed_fields || 'name, ';        END IF;
    IF NEW.employee_id IS DISTINCT FROM OLD.employee_id THEN changed_fields := changed_fields || 'employee_id, '; END IF;
    changed_fields    := RTRIM(changed_fields, ', ');
    NEW.action        := 'update';
    NEW.field_changed := changed_fields;
    NEW.update_date   := NOW();
    INSERT INTO staff_log (staff_id, account_id, name, employee_id, action, field_changed, create_date)
    VALUES (NEW.id, NEW.account_id, NEW.name, NEW.employee_id, 'update', changed_fields, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_log_staff_update
BEFORE UPDATE ON staff
FOR EACH ROW EXECUTE FUNCTION log_staff_update();


-- ============================================================
-- SERVICE: IMPORTS
-- Tables: import_batch
-- ============================================================

CREATE TABLE import_batch (
    id            UUID               PRIMARY KEY DEFAULT gen_random_uuid(),
    file_name     VARCHAR(255)       NOT NULL,
    imported_by   UUID               NULL REFERENCES staff(id) ON DELETE SET NULL,
    status        import_status_enum NOT NULL DEFAULT 'pending',
    row_count     INTEGER            NOT NULL DEFAULT 0,
    created_count INTEGER            NOT NULL DEFAULT 0,
    updated_count INTEGER            NOT NULL DEFAULT 0,
    error_count   INTEGER            NOT NULL DEFAULT 0,
    is_deleted    BOOLEAN            NOT NULL DEFAULT FALSE,
    deleted_at    TIMESTAMP          NULL,
    action        actions            DEFAULT 'create',
    field_changed VARCHAR(500)       NULL,
    create_date   TIMESTAMP          DEFAULT CURRENT_TIMESTAMP,
    update_date   TIMESTAMP          DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE import_batch_log (
    id              SERIAL             PRIMARY KEY,
    import_batch_id UUID               REFERENCES import_batch(id) ON DELETE CASCADE,
    file_name       VARCHAR(255)       NOT NULL,
    imported_by     UUID               NULL,
    status          import_status_enum NOT NULL,
    row_count       INTEGER            NOT NULL,
    created_count   INTEGER            NOT NULL,
    updated_count   INTEGER            NOT NULL,
    error_count     INTEGER            NOT NULL,
    is_deleted      BOOLEAN            NOT NULL,
    deleted_at      TIMESTAMP          NULL,
    action          actions            NOT NULL,
    field_changed   VARCHAR(500)       NULL,
    create_date     TIMESTAMP          DEFAULT CURRENT_TIMESTAMP
);

CREATE OR REPLACE FUNCTION set_import_batch()
RETURNS TRIGGER AS $$
DECLARE changed_fields TEXT := '';
BEGIN
    IF NEW.file_name    IS NOT NULL THEN changed_fields := changed_fields || 'file_name, ';    END IF;
    IF NEW.imported_by  IS NOT NULL THEN changed_fields := changed_fields || 'imported_by, ';  END IF;
    IF NEW.status       IS NOT NULL THEN changed_fields := changed_fields || 'status, ';       END IF;
    changed_fields    := RTRIM(changed_fields, ', ');
    NEW.action        := 'create';
    NEW.field_changed := changed_fields;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_import_batch
BEFORE INSERT ON import_batch
FOR EACH ROW EXECUTE FUNCTION set_import_batch();

CREATE OR REPLACE FUNCTION log_import_batch()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO import_batch_log (import_batch_id, file_name, imported_by, status, row_count, created_count, updated_count, error_count, is_deleted, deleted_at, action, field_changed, create_date)
    VALUES (NEW.id, NEW.file_name, NEW.imported_by, NEW.status, NEW.row_count, NEW.created_count, NEW.updated_count, NEW.error_count, NEW.is_deleted, NEW.deleted_at, NEW.action, NEW.field_changed, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_log_import_batch
AFTER INSERT ON import_batch
FOR EACH ROW EXECUTE FUNCTION log_import_batch();

CREATE OR REPLACE FUNCTION log_import_batch_update()
RETURNS TRIGGER AS $$
DECLARE
    changed_fields TEXT    := '';
    new_action     actions := 'update';
BEGIN
    IF NEW.file_name     IS DISTINCT FROM OLD.file_name     THEN changed_fields := changed_fields || 'file_name, ';     END IF;
    IF NEW.imported_by   IS DISTINCT FROM OLD.imported_by   THEN changed_fields := changed_fields || 'imported_by, ';   END IF;
    IF NEW.status        IS DISTINCT FROM OLD.status        THEN changed_fields := changed_fields || 'status, ';        END IF;
    IF NEW.row_count     IS DISTINCT FROM OLD.row_count     THEN changed_fields := changed_fields || 'row_count, ';     END IF;
    IF NEW.created_count IS DISTINCT FROM OLD.created_count THEN changed_fields := changed_fields || 'created_count, '; END IF;
    IF NEW.updated_count IS DISTINCT FROM OLD.updated_count THEN changed_fields := changed_fields || 'updated_count, '; END IF;
    IF NEW.error_count   IS DISTINCT FROM OLD.error_count   THEN changed_fields := changed_fields || 'error_count, ';   END IF;
    IF NEW.is_deleted    IS DISTINCT FROM OLD.is_deleted THEN
        changed_fields := changed_fields || 'is_deleted, ';
        IF NEW.is_deleted = TRUE THEN
            new_action     := 'delete';
            NEW.deleted_at := NOW();
        END IF;
    END IF;
    changed_fields    := RTRIM(changed_fields, ', ');
    NEW.action        := new_action;
    NEW.field_changed := changed_fields;
    NEW.update_date   := NOW();
    INSERT INTO import_batch_log (import_batch_id, file_name, imported_by, status, row_count, created_count, updated_count, error_count, is_deleted, deleted_at, action, field_changed, create_date)
    VALUES (NEW.id, NEW.file_name, NEW.imported_by, NEW.status, NEW.row_count, NEW.created_count, NEW.updated_count, NEW.error_count, NEW.is_deleted, NEW.deleted_at, new_action, changed_fields, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_log_import_batch_update
BEFORE UPDATE ON import_batch
FOR EACH ROW EXECUTE FUNCTION log_import_batch_update();


-- ============================================================
-- SERVICE: PROGRAMS
-- Tables: subject → subject_combination → combination_subject
--         major → major_combination → cutoff_score, admission_condition
-- ============================================================

-- ------------------------------------------------------------
-- subject
-- ------------------------------------------------------------
CREATE TABLE subject (
    id            VARCHAR(10)  PRIMARY KEY,  -- TO, VA, LI, HO, TA, SI, SU, GDCD…
    name          VARCHAR(100) NOT NULL,
    action        actions      DEFAULT 'create',
    field_changed VARCHAR(500) NULL,
    create_date   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    update_date   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE subject_log (
    id          SERIAL       PRIMARY KEY,
    subject_id  VARCHAR(10)  REFERENCES subject(id) ON DELETE CASCADE,
    name        VARCHAR(100) NOT NULL,
    action      actions      NOT NULL,
    field_changed VARCHAR(500) NULL,
    create_date TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

CREATE OR REPLACE FUNCTION set_subject()
RETURNS TRIGGER AS $$
DECLARE changed_fields TEXT := '';
BEGIN
    IF NEW.id   IS NOT NULL THEN changed_fields := changed_fields || 'id, ';   END IF;
    IF NEW.name IS NOT NULL THEN changed_fields := changed_fields || 'name, '; END IF;
    changed_fields    := RTRIM(changed_fields, ', ');
    NEW.action        := 'create';
    NEW.field_changed := changed_fields;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_subject
BEFORE INSERT ON subject
FOR EACH ROW EXECUTE FUNCTION set_subject();

CREATE OR REPLACE FUNCTION log_subject()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO subject_log (subject_id, name, action, field_changed, create_date)
    VALUES (NEW.id, NEW.name, NEW.action, NEW.field_changed, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_log_subject
AFTER INSERT ON subject
FOR EACH ROW EXECUTE FUNCTION log_subject();

CREATE OR REPLACE FUNCTION log_subject_update()
RETURNS TRIGGER AS $$
DECLARE changed_fields TEXT := '';
BEGIN
    IF NEW.name IS DISTINCT FROM OLD.name THEN changed_fields := changed_fields || 'name, '; END IF;
    changed_fields    := RTRIM(changed_fields, ', ');
    NEW.action        := 'update';
    NEW.field_changed := changed_fields;
    NEW.update_date   := NOW();
    INSERT INTO subject_log (subject_id, name, action, field_changed, create_date)
    VALUES (NEW.id, NEW.name, 'update', changed_fields, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_log_subject_update
BEFORE UPDATE ON subject
FOR EACH ROW EXECUTE FUNCTION log_subject_update();


-- ------------------------------------------------------------
-- subject_combination  (tổ hợp môn: A00, C03, D01, A00_CB_T…)
-- ------------------------------------------------------------
CREATE TABLE subject_combination (
    id            VARCHAR(20)  PRIMARY KEY,   -- A00, C03, A00_CB_T
    name          VARCHAR(100) NOT NULL DEFAULT '',
    action        actions      DEFAULT 'create',
    field_changed VARCHAR(500) NULL,
    create_date   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    update_date   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE subject_combination_log (
    id                     SERIAL       PRIMARY KEY,
    subject_combination_id VARCHAR(20)  REFERENCES subject_combination(id) ON DELETE CASCADE,
    name                   VARCHAR(100) NOT NULL,
    action                 actions      NOT NULL,
    field_changed          VARCHAR(500) NULL,
    create_date            TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

CREATE OR REPLACE FUNCTION set_subject_combination()
RETURNS TRIGGER AS $$
DECLARE changed_fields TEXT := '';
BEGIN
    IF NEW.id   IS NOT NULL THEN changed_fields := changed_fields || 'id, ';   END IF;
    IF NEW.name IS NOT NULL THEN changed_fields := changed_fields || 'name, '; END IF;
    changed_fields    := RTRIM(changed_fields, ', ');
    NEW.action        := 'create';
    NEW.field_changed := changed_fields;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_subject_combination
BEFORE INSERT ON subject_combination
FOR EACH ROW EXECUTE FUNCTION set_subject_combination();

CREATE OR REPLACE FUNCTION log_subject_combination()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO subject_combination_log (subject_combination_id, name, action, field_changed, create_date)
    VALUES (NEW.id, NEW.name, NEW.action, NEW.field_changed, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_log_subject_combination
AFTER INSERT ON subject_combination
FOR EACH ROW EXECUTE FUNCTION log_subject_combination();

CREATE OR REPLACE FUNCTION log_subject_combination_update()
RETURNS TRIGGER AS $$
DECLARE changed_fields TEXT := '';
BEGIN
    IF NEW.name IS DISTINCT FROM OLD.name THEN changed_fields := changed_fields || 'name, '; END IF;
    changed_fields    := RTRIM(changed_fields, ', ');
    NEW.action        := 'update';
    NEW.field_changed := changed_fields;
    NEW.update_date   := NOW();
    INSERT INTO subject_combination_log (subject_combination_id, name, action, field_changed, create_date)
    VALUES (NEW.id, NEW.name, 'update', changed_fields, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_log_subject_combination_update
BEFORE UPDATE ON subject_combination
FOR EACH ROW EXECUTE FUNCTION log_subject_combination_update();


-- ------------------------------------------------------------
-- combination_subject
-- Stores per-subject weight AND which exam board to source from.
--
-- A00_CB_T example:
--   (A00_CB_T, TO, 1.5, 'CB',   1)  ← Math từ thi ĐGNL chuyên biệt, hệ số 1.5
--   (A00_CB_T, LI, 1.0, 'THPT', 2)  ← Lý từ thi THPT quốc gia
--   (A00_CB_T, HO, 1.0, 'THPT', 3)  ← Hóa từ thi THPT quốc gia
--
-- Score formula: SUM(score_i * weight_i) / SUM(weight_i)
-- ------------------------------------------------------------
CREATE TABLE combination_subject (
    id                     SERIAL          PRIMARY KEY,
    subject_combination_id VARCHAR(20)     NOT NULL REFERENCES subject_combination(id) ON DELETE CASCADE,
    subject_id             VARCHAR(10)     NOT NULL REFERENCES subject(id) ON DELETE RESTRICT,
    weight                 NUMERIC(5, 3)   NOT NULL DEFAULT 1.000,
    score_type             score_type_enum NOT NULL DEFAULT 'THPT',
    position               SMALLINT        NOT NULL CHECK (position BETWEEN 1 AND 10),
    action                 actions         DEFAULT 'create',
    field_changed          VARCHAR(500)    NULL,
    create_date            TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    update_date            TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_combination_subject UNIQUE (subject_combination_id, subject_id)
);

CREATE INDEX idx_combination_subject_combination ON combination_subject(subject_combination_id);
CREATE INDEX idx_combination_subject_subject     ON combination_subject(subject_id);

CREATE TABLE combination_subject_log (
    id                     SERIAL          PRIMARY KEY,
    combination_subject_id INTEGER         REFERENCES combination_subject(id) ON DELETE CASCADE,
    subject_combination_id VARCHAR(20)     NOT NULL,
    subject_id             VARCHAR(10)     NOT NULL,
    weight                 NUMERIC(5, 3)   NOT NULL,
    score_type             score_type_enum NOT NULL,
    position               SMALLINT        NOT NULL,
    action                 actions         NOT NULL,
    field_changed          VARCHAR(500)    NULL,
    create_date            TIMESTAMP       DEFAULT CURRENT_TIMESTAMP
);

CREATE OR REPLACE FUNCTION set_combination_subject()
RETURNS TRIGGER AS $$
DECLARE changed_fields TEXT := '';
BEGIN
    IF NEW.subject_combination_id IS NOT NULL THEN changed_fields := changed_fields || 'subject_combination_id, '; END IF;
    IF NEW.subject_id             IS NOT NULL THEN changed_fields := changed_fields || 'subject_id, ';             END IF;
    IF NEW.weight                 IS NOT NULL THEN changed_fields := changed_fields || 'weight, ';                 END IF;
    IF NEW.score_type             IS NOT NULL THEN changed_fields := changed_fields || 'score_type, ';             END IF;
    IF NEW.position               IS NOT NULL THEN changed_fields := changed_fields || 'position, ';               END IF;
    changed_fields    := RTRIM(changed_fields, ', ');
    NEW.action        := 'create';
    NEW.field_changed := changed_fields;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_combination_subject
BEFORE INSERT ON combination_subject
FOR EACH ROW EXECUTE FUNCTION set_combination_subject();

CREATE OR REPLACE FUNCTION log_combination_subject()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO combination_subject_log (combination_subject_id, subject_combination_id, subject_id, weight, score_type, position, action, field_changed, create_date)
    VALUES (NEW.id, NEW.subject_combination_id, NEW.subject_id, NEW.weight, NEW.score_type, NEW.position, NEW.action, NEW.field_changed, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_log_combination_subject
AFTER INSERT ON combination_subject
FOR EACH ROW EXECUTE FUNCTION log_combination_subject();

CREATE OR REPLACE FUNCTION log_combination_subject_update()
RETURNS TRIGGER AS $$
DECLARE changed_fields TEXT := '';
BEGIN
    IF NEW.weight     IS DISTINCT FROM OLD.weight     THEN changed_fields := changed_fields || 'weight, ';     END IF;
    IF NEW.score_type IS DISTINCT FROM OLD.score_type THEN changed_fields := changed_fields || 'score_type, '; END IF;
    IF NEW.position   IS DISTINCT FROM OLD.position   THEN changed_fields := changed_fields || 'position, ';   END IF;
    changed_fields    := RTRIM(changed_fields, ', ');
    NEW.action        := 'update';
    NEW.field_changed := changed_fields;
    NEW.update_date   := NOW();
    INSERT INTO combination_subject_log (combination_subject_id, subject_combination_id, subject_id, weight, score_type, position, action, field_changed, create_date)
    VALUES (NEW.id, NEW.subject_combination_id, NEW.subject_id, NEW.weight, NEW.score_type, NEW.position, 'update', changed_fields, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_log_combination_subject_update
BEFORE UPDATE ON combination_subject
FOR EACH ROW EXECUTE FUNCTION log_combination_subject_update();


-- ------------------------------------------------------------
-- major (ngành)
-- ------------------------------------------------------------
CREATE TABLE major (
    id            CHAR(10)     PRIMARY KEY,   -- 7140101
    name          VARCHAR(200) NOT NULL,
    quota         INTEGER      NULL CHECK (quota > 0),
    action        actions      DEFAULT 'create',
    field_changed VARCHAR(500) NULL,
    create_date   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    update_date   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_major_id ON major(id);

CREATE TABLE major_log (
    id          SERIAL       PRIMARY KEY,
    major_id    CHAR(10)     REFERENCES major(id) ON DELETE CASCADE,
    name        VARCHAR(200) NOT NULL,
    quota       INTEGER      NULL,
    action      actions      NOT NULL,
    field_changed VARCHAR(500) NULL,
    create_date TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

CREATE OR REPLACE FUNCTION set_major()
RETURNS TRIGGER AS $$
DECLARE changed_fields TEXT := '';
BEGIN
    IF NEW.id    IS NOT NULL THEN changed_fields := changed_fields || 'id, ';    END IF;
    IF NEW.name  IS NOT NULL THEN changed_fields := changed_fields || 'name, ';  END IF;
    IF NEW.quota IS NOT NULL THEN changed_fields := changed_fields || 'quota, '; END IF;
    changed_fields    := RTRIM(changed_fields, ', ');
    NEW.action        := 'create';
    NEW.field_changed := changed_fields;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_major
BEFORE INSERT ON major
FOR EACH ROW EXECUTE FUNCTION set_major();

CREATE OR REPLACE FUNCTION log_major()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO major_log (major_id, name, quota, action, field_changed, create_date)
    VALUES (NEW.id, NEW.name, NEW.quota, NEW.action, NEW.field_changed, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_log_major
AFTER INSERT ON major
FOR EACH ROW EXECUTE FUNCTION log_major();

CREATE OR REPLACE FUNCTION log_major_update()
RETURNS TRIGGER AS $$
DECLARE changed_fields TEXT := '';
BEGIN
    IF NEW.name  IS DISTINCT FROM OLD.name  THEN changed_fields := changed_fields || 'name, ';  END IF;
    IF NEW.quota IS DISTINCT FROM OLD.quota THEN changed_fields := changed_fields || 'quota, '; END IF;
    changed_fields    := RTRIM(changed_fields, ', ');
    NEW.action        := 'update';
    NEW.field_changed := changed_fields;
    NEW.update_date   := NOW();
    INSERT INTO major_log (major_id, name, quota, action, field_changed, create_date)
    VALUES (NEW.id, NEW.name, NEW.quota, 'update', changed_fields, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_log_major_update
BEFORE UPDATE ON major
FOR EACH ROW EXECUTE FUNCTION log_major_update();


-- ------------------------------------------------------------
-- major_combination  (tổ hợp ngành)
-- ------------------------------------------------------------
CREATE TABLE major_combination (
    id                     SERIAL        PRIMARY KEY,
    major_id               CHAR(10)      NOT NULL REFERENCES major(id) ON DELETE CASCADE,
    subject_combination_id VARCHAR(20)   NOT NULL REFERENCES subject_combination(id) ON DELETE RESTRICT,
    min_score              NUMERIC(5, 2) NOT NULL DEFAULT 0,   -- DiemSan
    dgnl_offset            NUMERIC(4, 2) NOT NULL DEFAULT 0,   -- dolech: DGNL score adjustment
    is_primary             BOOLEAN       NOT NULL DEFAULT FALSE, -- Goc=1
    action                 actions       DEFAULT 'create',
    field_changed          VARCHAR(500)  NULL,
    create_date            TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    update_date            TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_major_combination UNIQUE (major_id, subject_combination_id)
);

CREATE INDEX idx_major_combination_major        ON major_combination(major_id);
CREATE INDEX idx_major_combination_combination  ON major_combination(subject_combination_id);

CREATE TABLE major_combination_log (
    id                     SERIAL        PRIMARY KEY,
    major_combination_id   INTEGER       REFERENCES major_combination(id) ON DELETE CASCADE,
    major_id               CHAR(10)      NOT NULL,
    subject_combination_id VARCHAR(20)   NOT NULL,
    min_score              NUMERIC(5, 2) NOT NULL,
    dgnl_offset            NUMERIC(4, 2) NOT NULL,
    is_primary             BOOLEAN       NOT NULL,
    action                 actions       NOT NULL,
    field_changed          VARCHAR(500)  NULL,
    create_date            TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

CREATE OR REPLACE FUNCTION set_major_combination()
RETURNS TRIGGER AS $$
DECLARE changed_fields TEXT := '';
BEGIN
    IF NEW.major_id               IS NOT NULL THEN changed_fields := changed_fields || 'major_id, ';               END IF;
    IF NEW.subject_combination_id IS NOT NULL THEN changed_fields := changed_fields || 'subject_combination_id, '; END IF;
    IF NEW.min_score              IS NOT NULL THEN changed_fields := changed_fields || 'min_score, ';              END IF;
    IF NEW.dgnl_offset            IS NOT NULL THEN changed_fields := changed_fields || 'dgnl_offset, ';            END IF;
    IF NEW.is_primary             IS NOT NULL THEN changed_fields := changed_fields || 'is_primary, ';             END IF;
    changed_fields    := RTRIM(changed_fields, ', ');
    NEW.action        := 'create';
    NEW.field_changed := changed_fields;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_major_combination
BEFORE INSERT ON major_combination
FOR EACH ROW EXECUTE FUNCTION set_major_combination();

CREATE OR REPLACE FUNCTION log_major_combination()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO major_combination_log (major_combination_id, major_id, subject_combination_id, min_score, dgnl_offset, is_primary, action, field_changed, create_date)
    VALUES (NEW.id, NEW.major_id, NEW.subject_combination_id, NEW.min_score, NEW.dgnl_offset, NEW.is_primary, NEW.action, NEW.field_changed, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_log_major_combination
AFTER INSERT ON major_combination
FOR EACH ROW EXECUTE FUNCTION log_major_combination();

CREATE OR REPLACE FUNCTION log_major_combination_update()
RETURNS TRIGGER AS $$
DECLARE changed_fields TEXT := '';
BEGIN
    IF NEW.min_score   IS DISTINCT FROM OLD.min_score   THEN changed_fields := changed_fields || 'min_score, ';   END IF;
    IF NEW.dgnl_offset IS DISTINCT FROM OLD.dgnl_offset THEN changed_fields := changed_fields || 'dgnl_offset, '; END IF;
    IF NEW.is_primary  IS DISTINCT FROM OLD.is_primary  THEN changed_fields := changed_fields || 'is_primary, ';  END IF;
    changed_fields    := RTRIM(changed_fields, ', ');
    NEW.action        := 'update';
    NEW.field_changed := changed_fields;
    NEW.update_date   := NOW();
    INSERT INTO major_combination_log (major_combination_id, major_id, subject_combination_id, min_score, dgnl_offset, is_primary, action, field_changed, create_date)
    VALUES (NEW.id, NEW.major_id, NEW.subject_combination_id, NEW.min_score, NEW.dgnl_offset, NEW.is_primary, 'update', changed_fields, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_log_major_combination_update
BEFORE UPDATE ON major_combination
FOR EACH ROW EXECUTE FUNCTION log_major_combination_update();


-- ------------------------------------------------------------
-- cutoff_score  (điểm chuẩn)
-- ------------------------------------------------------------
CREATE TABLE cutoff_score (
    id                   SERIAL        PRIMARY KEY,
    major_combination_id INTEGER       NOT NULL REFERENCES major_combination(id) ON DELETE CASCADE,
    cutoff               NUMERIC(5, 2) NOT NULL,
    round                SMALLINT      NOT NULL DEFAULT 1,
    set_by               UUID          NULL REFERENCES staff(id) ON DELETE SET NULL,
    action               actions       DEFAULT 'create',
    field_changed        VARCHAR(500)  NULL,
    create_date          TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    update_date          TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_cutoff_score UNIQUE (major_combination_id, round)
);

CREATE TABLE cutoff_score_log (
    id                   SERIAL        PRIMARY KEY,
    cutoff_score_id      INTEGER       REFERENCES cutoff_score(id) ON DELETE CASCADE,
    major_combination_id INTEGER       NOT NULL,
    cutoff               NUMERIC(5, 2) NOT NULL,
    round                SMALLINT      NOT NULL,
    set_by               UUID          NULL,
    action               actions       NOT NULL,
    field_changed        VARCHAR(500)  NULL,
    create_date          TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

CREATE OR REPLACE FUNCTION set_cutoff_score()
RETURNS TRIGGER AS $$
DECLARE changed_fields TEXT := '';
BEGIN
    IF NEW.major_combination_id IS NOT NULL THEN changed_fields := changed_fields || 'major_combination_id, '; END IF;
    IF NEW.cutoff               IS NOT NULL THEN changed_fields := changed_fields || 'cutoff, ';               END IF;
    IF NEW.round                IS NOT NULL THEN changed_fields := changed_fields || 'round, ';                END IF;
    IF NEW.set_by               IS NOT NULL THEN changed_fields := changed_fields || 'set_by, ';               END IF;
    changed_fields    := RTRIM(changed_fields, ', ');
    NEW.action        := 'create';
    NEW.field_changed := changed_fields;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_cutoff_score
BEFORE INSERT ON cutoff_score
FOR EACH ROW EXECUTE FUNCTION set_cutoff_score();

CREATE OR REPLACE FUNCTION log_cutoff_score()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO cutoff_score_log (cutoff_score_id, major_combination_id, cutoff, round, set_by, action, field_changed, create_date)
    VALUES (NEW.id, NEW.major_combination_id, NEW.cutoff, NEW.round, NEW.set_by, NEW.action, NEW.field_changed, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_log_cutoff_score
AFTER INSERT ON cutoff_score
FOR EACH ROW EXECUTE FUNCTION log_cutoff_score();

CREATE OR REPLACE FUNCTION log_cutoff_score_update()
RETURNS TRIGGER AS $$
DECLARE changed_fields TEXT := '';
BEGIN
    IF NEW.cutoff  IS DISTINCT FROM OLD.cutoff  THEN changed_fields := changed_fields || 'cutoff, ';  END IF;
    IF NEW.round   IS DISTINCT FROM OLD.round   THEN changed_fields := changed_fields || 'round, ';   END IF;
    IF NEW.set_by  IS DISTINCT FROM OLD.set_by  THEN changed_fields := changed_fields || 'set_by, ';  END IF;
    changed_fields    := RTRIM(changed_fields, ', ');
    NEW.action        := 'update';
    NEW.field_changed := changed_fields;
    NEW.update_date   := NOW();
    INSERT INTO cutoff_score_log (cutoff_score_id, major_combination_id, cutoff, round, set_by, action, field_changed, create_date)
    VALUES (NEW.id, NEW.major_combination_id, NEW.cutoff, NEW.round, NEW.set_by, 'update', changed_fields, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_log_cutoff_score_update
BEFORE UPDATE ON cutoff_score
FOR EACH ROW EXECUTE FUNCTION log_cutoff_score_update();


-- ------------------------------------------------------------
-- admission_condition  (điều kiện phụ)
-- ------------------------------------------------------------
CREATE TABLE admission_condition (
    id                   SERIAL        PRIMARY KEY,
    major_combination_id INTEGER       NOT NULL REFERENCES major_combination(id) ON DELETE CASCADE,
    subject_id           VARCHAR(10)   NULL REFERENCES subject(id) ON DELETE SET NULL,
    min_subject_score    NUMERIC(4, 2) NULL,
    min_total_score      NUMERIC(5, 2) NULL,
    note                 TEXT          NOT NULL DEFAULT '',
    action               actions       DEFAULT 'create',
    field_changed        VARCHAR(500)  NULL,
    create_date          TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    update_date          TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE admission_condition_log (
    id                   SERIAL        PRIMARY KEY,
    admission_condition_id INTEGER      REFERENCES admission_condition(id) ON DELETE CASCADE,
    major_combination_id INTEGER       NOT NULL,
    subject_id           VARCHAR(10)   NULL,
    min_subject_score    NUMERIC(4, 2) NULL,
    min_total_score      NUMERIC(5, 2) NULL,
    note                 TEXT          NOT NULL,
    action               actions       NOT NULL,
    field_changed        VARCHAR(500)  NULL,
    create_date          TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

CREATE OR REPLACE FUNCTION set_admission_condition()
RETURNS TRIGGER AS $$
DECLARE changed_fields TEXT := '';
BEGIN
    IF NEW.major_combination_id IS NOT NULL THEN changed_fields := changed_fields || 'major_combination_id, '; END IF;
    IF NEW.subject_id           IS NOT NULL THEN changed_fields := changed_fields || 'subject_id, ';           END IF;
    IF NEW.min_subject_score    IS NOT NULL THEN changed_fields := changed_fields || 'min_subject_score, ';    END IF;
    IF NEW.min_total_score      IS NOT NULL THEN changed_fields := changed_fields || 'min_total_score, ';      END IF;
    IF NEW.note                 IS NOT NULL THEN changed_fields := changed_fields || 'note, ';                 END IF;
    changed_fields    := RTRIM(changed_fields, ', ');
    NEW.action        := 'create';
    NEW.field_changed := changed_fields;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_admission_condition
BEFORE INSERT ON admission_condition
FOR EACH ROW EXECUTE FUNCTION set_admission_condition();

CREATE OR REPLACE FUNCTION log_admission_condition()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO admission_condition_log (admission_condition_id, major_combination_id, subject_id, min_subject_score, min_total_score, note, action, field_changed, create_date)
    VALUES (NEW.id, NEW.major_combination_id, NEW.subject_id, NEW.min_subject_score, NEW.min_total_score, NEW.note, NEW.action, NEW.field_changed, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_log_admission_condition
AFTER INSERT ON admission_condition
FOR EACH ROW EXECUTE FUNCTION log_admission_condition();

CREATE OR REPLACE FUNCTION log_admission_condition_update()
RETURNS TRIGGER AS $$
DECLARE changed_fields TEXT := '';
BEGIN
    IF NEW.subject_id        IS DISTINCT FROM OLD.subject_id        THEN changed_fields := changed_fields || 'subject_id, ';        END IF;
    IF NEW.min_subject_score IS DISTINCT FROM OLD.min_subject_score THEN changed_fields := changed_fields || 'min_subject_score, '; END IF;
    IF NEW.min_total_score   IS DISTINCT FROM OLD.min_total_score   THEN changed_fields := changed_fields || 'min_total_score, ';   END IF;
    IF NEW.note              IS DISTINCT FROM OLD.note              THEN changed_fields := changed_fields || 'note, ';              END IF;
    changed_fields    := RTRIM(changed_fields, ', ');
    NEW.action        := 'update';
    NEW.field_changed := changed_fields;
    NEW.update_date   := NOW();
    INSERT INTO admission_condition_log (admission_condition_id, major_combination_id, subject_id, min_subject_score, min_total_score, note, action, field_changed, create_date)
    VALUES (NEW.id, NEW.major_combination_id, NEW.subject_id, NEW.min_subject_score, NEW.min_total_score, NEW.note, 'update', changed_fields, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_log_admission_condition_update
BEFORE UPDATE ON admission_condition
FOR EACH ROW EXECUTE FUNCTION log_admission_condition_update();


-- ============================================================
-- SERVICE: CANDIDATES
-- Tables: candidate → region_priority, score_board → subject_score
-- ============================================================

-- ------------------------------------------------------------
-- candidate (thí sinh)
-- ------------------------------------------------------------
CREATE TABLE candidate (
    id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    cccd             CHAR(12)      NOT NULL UNIQUE,
    ticket_number    VARCHAR(20)   NULL UNIQUE,
    graduation_year  SMALLINT      NULL CHECK (graduation_year BETWEEN 2000 AND 2100),
    academic_level   CHAR(1)       NULL CHECK (academic_level IN ('0', '1')),  -- 0=Khá, 1=Giỏi
    graduation_score NUMERIC(4, 2) NULL CHECK (graduation_score BETWEEN 0 AND 10),
    import_batch_id  UUID          NULL REFERENCES import_batch(id) ON DELETE SET NULL,
    is_deleted       BOOLEAN       NOT NULL DEFAULT FALSE,
    deleted_at       TIMESTAMP     NULL,
    action           actions       DEFAULT 'create',
    field_changed    VARCHAR(500)  NULL,
    create_date      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    update_date      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_candidate_cccd          ON candidate(cccd) WHERE is_deleted = FALSE;
CREATE INDEX        idx_candidate_ticket_number ON candidate(ticket_number);
CREATE INDEX        idx_candidate_import_batch  ON candidate(import_batch_id);

CREATE TABLE candidate_log (
    id               SERIAL        PRIMARY KEY,
    candidate_id     UUID          REFERENCES candidate(id) ON DELETE CASCADE,
    cccd             CHAR(12)      NOT NULL,
    ticket_number    VARCHAR(20)   NULL,
    graduation_year  SMALLINT      NULL,
    academic_level   CHAR(1)       NULL,
    graduation_score NUMERIC(4, 2) NULL,
    import_batch_id  UUID          NULL,
    is_deleted       BOOLEAN       NOT NULL,
    deleted_at       TIMESTAMP     NULL,
    action           actions       NOT NULL,
    field_changed    VARCHAR(500)  NULL,
    create_date      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

CREATE OR REPLACE FUNCTION set_candidate()
RETURNS TRIGGER AS $$
DECLARE changed_fields TEXT := '';
BEGIN
    IF NEW.cccd             IS NOT NULL THEN changed_fields := changed_fields || 'cccd, ';             END IF;
    IF NEW.ticket_number    IS NOT NULL THEN changed_fields := changed_fields || 'ticket_number, ';    END IF;
    IF NEW.graduation_year  IS NOT NULL THEN changed_fields := changed_fields || 'graduation_year, ';  END IF;
    IF NEW.academic_level   IS NOT NULL THEN changed_fields := changed_fields || 'academic_level, ';   END IF;
    IF NEW.graduation_score IS NOT NULL THEN changed_fields := changed_fields || 'graduation_score, '; END IF;
    IF NEW.import_batch_id  IS NOT NULL THEN changed_fields := changed_fields || 'import_batch_id, ';  END IF;
    changed_fields    := RTRIM(changed_fields, ', ');
    NEW.action        := 'create';
    NEW.field_changed := changed_fields;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_candidate
BEFORE INSERT ON candidate
FOR EACH ROW EXECUTE FUNCTION set_candidate();

CREATE OR REPLACE FUNCTION log_candidate()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO candidate_log (candidate_id, cccd, ticket_number, graduation_year, academic_level, graduation_score, import_batch_id, is_deleted, deleted_at, action, field_changed, create_date)
    VALUES (NEW.id, NEW.cccd, NEW.ticket_number, NEW.graduation_year, NEW.academic_level, NEW.graduation_score, NEW.import_batch_id, NEW.is_deleted, NEW.deleted_at, NEW.action, NEW.field_changed, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_log_candidate
AFTER INSERT ON candidate
FOR EACH ROW EXECUTE FUNCTION log_candidate();

CREATE OR REPLACE FUNCTION log_candidate_update()
RETURNS TRIGGER AS $$
DECLARE
    changed_fields TEXT    := '';
    new_action     actions := 'update';
BEGIN
    IF NEW.cccd             IS DISTINCT FROM OLD.cccd             THEN changed_fields := changed_fields || 'cccd, ';             END IF;
    IF NEW.ticket_number    IS DISTINCT FROM OLD.ticket_number    THEN changed_fields := changed_fields || 'ticket_number, ';    END IF;
    IF NEW.graduation_year  IS DISTINCT FROM OLD.graduation_year  THEN changed_fields := changed_fields || 'graduation_year, ';  END IF;
    IF NEW.academic_level   IS DISTINCT FROM OLD.academic_level   THEN changed_fields := changed_fields || 'academic_level, ';   END IF;
    IF NEW.graduation_score IS DISTINCT FROM OLD.graduation_score THEN changed_fields := changed_fields || 'graduation_score, '; END IF;
    IF NEW.import_batch_id  IS DISTINCT FROM OLD.import_batch_id  THEN changed_fields := changed_fields || 'import_batch_id, ';  END IF;
    IF NEW.is_deleted IS DISTINCT FROM OLD.is_deleted THEN
        changed_fields := changed_fields || 'is_deleted, ';
        IF NEW.is_deleted = TRUE THEN
            new_action     := 'delete';
            NEW.deleted_at := NOW();
        END IF;
    END IF;
    changed_fields    := RTRIM(changed_fields, ', ');
    NEW.action        := new_action;
    NEW.field_changed := changed_fields;
    NEW.update_date   := NOW();
    INSERT INTO candidate_log (candidate_id, cccd, ticket_number, graduation_year, academic_level, graduation_score, import_batch_id, is_deleted, deleted_at, action, field_changed, create_date)
    VALUES (NEW.id, NEW.cccd, NEW.ticket_number, NEW.graduation_year, NEW.academic_level, NEW.graduation_score, NEW.import_batch_id, NEW.is_deleted, NEW.deleted_at, new_action, changed_fields, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_log_candidate_update
BEFORE UPDATE ON candidate
FOR EACH ROW EXECUTE FUNCTION log_candidate_update();


-- ------------------------------------------------------------
-- region_priority  (khu vực ưu tiên — 1:1 with candidate)
-- ------------------------------------------------------------
CREATE TABLE region_priority (
    id           SERIAL        PRIMARY KEY,
    candidate_id UUID          NOT NULL UNIQUE REFERENCES candidate(id) ON DELETE CASCADE,
    region_code  VARCHAR(5)    NOT NULL,   -- 1, 2, 2NT, 3
    special_code VARCHAR(10)   NULL,       -- DT_DIEM: mã đối tượng ưu tiên
    bonus_score  NUMERIC(4, 2) NOT NULL DEFAULT 0,
    action       actions       DEFAULT 'create',
    field_changed VARCHAR(500) NULL,
    create_date  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    update_date  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE region_priority_log (
    id                 SERIAL        PRIMARY KEY,
    region_priority_id INTEGER       REFERENCES region_priority(id) ON DELETE CASCADE,
    candidate_id       UUID          NOT NULL,
    region_code        VARCHAR(5)    NOT NULL,
    special_code       VARCHAR(10)   NULL,
    bonus_score        NUMERIC(4, 2) NOT NULL,
    action             actions       NOT NULL,
    field_changed      VARCHAR(500)  NULL,
    create_date        TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

CREATE OR REPLACE FUNCTION set_region_priority()
RETURNS TRIGGER AS $$
DECLARE changed_fields TEXT := '';
BEGIN
    IF NEW.candidate_id IS NOT NULL THEN changed_fields := changed_fields || 'candidate_id, '; END IF;
    IF NEW.region_code  IS NOT NULL THEN changed_fields := changed_fields || 'region_code, ';  END IF;
    IF NEW.special_code IS NOT NULL THEN changed_fields := changed_fields || 'special_code, '; END IF;
    IF NEW.bonus_score  IS NOT NULL THEN changed_fields := changed_fields || 'bonus_score, ';  END IF;
    changed_fields    := RTRIM(changed_fields, ', ');
    NEW.action        := 'create';
    NEW.field_changed := changed_fields;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_region_priority
BEFORE INSERT ON region_priority
FOR EACH ROW EXECUTE FUNCTION set_region_priority();

CREATE OR REPLACE FUNCTION log_region_priority()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO region_priority_log (region_priority_id, candidate_id, region_code, special_code, bonus_score, action, field_changed, create_date)
    VALUES (NEW.id, NEW.candidate_id, NEW.region_code, NEW.special_code, NEW.bonus_score, NEW.action, NEW.field_changed, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_log_region_priority
AFTER INSERT ON region_priority
FOR EACH ROW EXECUTE FUNCTION log_region_priority();

CREATE OR REPLACE FUNCTION log_region_priority_update()
RETURNS TRIGGER AS $$
DECLARE changed_fields TEXT := '';
BEGIN
    IF NEW.region_code  IS DISTINCT FROM OLD.region_code  THEN changed_fields := changed_fields || 'region_code, ';  END IF;
    IF NEW.special_code IS DISTINCT FROM OLD.special_code THEN changed_fields := changed_fields || 'special_code, '; END IF;
    IF NEW.bonus_score  IS DISTINCT FROM OLD.bonus_score  THEN changed_fields := changed_fields || 'bonus_score, ';  END IF;
    changed_fields    := RTRIM(changed_fields, ', ');
    NEW.action        := 'update';
    NEW.field_changed := changed_fields;
    NEW.update_date   := NOW();
    INSERT INTO region_priority_log (region_priority_id, candidate_id, region_code, special_code, bonus_score, action, field_changed, create_date)
    VALUES (NEW.id, NEW.candidate_id, NEW.region_code, NEW.special_code, NEW.bonus_score, 'update', changed_fields, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_log_region_priority_update
BEFORE UPDATE ON region_priority
FOR EACH ROW EXECUTE FUNCTION log_region_priority_update();


-- ------------------------------------------------------------
-- score_board  (bảng điểm — groups scores by exam type)
-- ------------------------------------------------------------
CREATE TABLE score_board (
    id           SERIAL          PRIMARY KEY,
    candidate_id UUID            NOT NULL REFERENCES candidate(id) ON DELETE CASCADE,
    score_type   score_type_enum NOT NULL,
    action       actions         DEFAULT 'create',
    field_changed VARCHAR(500)   NULL,
    create_date  TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    update_date  TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_score_board UNIQUE (candidate_id, score_type)
);

CREATE INDEX idx_score_board_candidate ON score_board(candidate_id);

CREATE TABLE score_board_log (
    id             SERIAL          PRIMARY KEY,
    score_board_id INTEGER         REFERENCES score_board(id) ON DELETE CASCADE,
    candidate_id   UUID            NOT NULL,
    score_type     score_type_enum NOT NULL,
    action         actions         NOT NULL,
    field_changed  VARCHAR(500)    NULL,
    create_date    TIMESTAMP       DEFAULT CURRENT_TIMESTAMP
);

CREATE OR REPLACE FUNCTION set_score_board()
RETURNS TRIGGER AS $$
DECLARE changed_fields TEXT := '';
BEGIN
    IF NEW.candidate_id IS NOT NULL THEN changed_fields := changed_fields || 'candidate_id, '; END IF;
    IF NEW.score_type   IS NOT NULL THEN changed_fields := changed_fields || 'score_type, ';   END IF;
    changed_fields    := RTRIM(changed_fields, ', ');
    NEW.action        := 'create';
    NEW.field_changed := changed_fields;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_score_board
BEFORE INSERT ON score_board
FOR EACH ROW EXECUTE FUNCTION set_score_board();

CREATE OR REPLACE FUNCTION log_score_board()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO score_board_log (score_board_id, candidate_id, score_type, action, field_changed, create_date)
    VALUES (NEW.id, NEW.candidate_id, NEW.score_type, NEW.action, NEW.field_changed, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_log_score_board
AFTER INSERT ON score_board
FOR EACH ROW EXECUTE FUNCTION log_score_board();

CREATE OR REPLACE FUNCTION log_score_board_update()
RETURNS TRIGGER AS $$
DECLARE changed_fields TEXT := '';
BEGIN
    IF NEW.score_type IS DISTINCT FROM OLD.score_type THEN changed_fields := changed_fields || 'score_type, '; END IF;
    changed_fields    := RTRIM(changed_fields, ', ');
    NEW.action        := 'update';
    NEW.field_changed := changed_fields;
    NEW.update_date   := NOW();
    INSERT INTO score_board_log (score_board_id, candidate_id, score_type, action, field_changed, create_date)
    VALUES (NEW.id, NEW.candidate_id, NEW.score_type, 'update', changed_fields, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_log_score_board_update
BEFORE UPDATE ON score_board
FOR EACH ROW EXECUTE FUNCTION log_score_board_update();


-- ------------------------------------------------------------
-- subject_score  (điểm môn học)
-- ------------------------------------------------------------
CREATE TABLE subject_score (
    id             SERIAL        PRIMARY KEY,
    score_board_id INTEGER       NOT NULL REFERENCES score_board(id) ON DELETE CASCADE,
    subject_id     VARCHAR(10)   NOT NULL REFERENCES subject(id) ON DELETE RESTRICT,
    score          NUMERIC(5, 2) NULL CHECK (score >= 0),
    action         actions       DEFAULT 'create',
    field_changed  VARCHAR(500)  NULL,
    create_date    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    update_date    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_subject_score UNIQUE (score_board_id, subject_id)
);

CREATE INDEX idx_subject_score_board   ON subject_score(score_board_id);
CREATE INDEX idx_subject_score_subject ON subject_score(subject_id);

CREATE TABLE subject_score_log (
    id              SERIAL        PRIMARY KEY,
    subject_score_id INTEGER      REFERENCES subject_score(id) ON DELETE CASCADE,
    score_board_id  INTEGER       NOT NULL,
    subject_id      VARCHAR(10)   NOT NULL,
    score           NUMERIC(5, 2) NULL,
    action          actions       NOT NULL,
    field_changed   VARCHAR(500)  NULL,
    create_date     TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

CREATE OR REPLACE FUNCTION set_subject_score()
RETURNS TRIGGER AS $$
DECLARE changed_fields TEXT := '';
BEGIN
    IF NEW.score_board_id IS NOT NULL THEN changed_fields := changed_fields || 'score_board_id, '; END IF;
    IF NEW.subject_id     IS NOT NULL THEN changed_fields := changed_fields || 'subject_id, ';     END IF;
    IF NEW.score          IS NOT NULL THEN changed_fields := changed_fields || 'score, ';          END IF;
    changed_fields    := RTRIM(changed_fields, ', ');
    NEW.action        := 'create';
    NEW.field_changed := changed_fields;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_subject_score
BEFORE INSERT ON subject_score
FOR EACH ROW EXECUTE FUNCTION set_subject_score();

CREATE OR REPLACE FUNCTION log_subject_score()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO subject_score_log (subject_score_id, score_board_id, subject_id, score, action, field_changed, create_date)
    VALUES (NEW.id, NEW.score_board_id, NEW.subject_id, NEW.score, NEW.action, NEW.field_changed, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_log_subject_score
AFTER INSERT ON subject_score
FOR EACH ROW EXECUTE FUNCTION log_subject_score();

CREATE OR REPLACE FUNCTION log_subject_score_update()
RETURNS TRIGGER AS $$
DECLARE changed_fields TEXT := '';
BEGIN
    IF NEW.score IS DISTINCT FROM OLD.score THEN changed_fields := changed_fields || 'score, '; END IF;
    changed_fields    := RTRIM(changed_fields, ', ');
    NEW.action        := 'update';
    NEW.field_changed := changed_fields;
    NEW.update_date   := NOW();
    INSERT INTO subject_score_log (subject_score_id, score_board_id, subject_id, score, action, field_changed, create_date)
    VALUES (NEW.id, NEW.score_board_id, NEW.subject_id, NEW.score, 'update', changed_fields, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_log_subject_score_update
BEFORE UPDATE ON subject_score
FOR EACH ROW EXECUTE FUNCTION log_subject_score_update();


-- ============================================================
-- SERVICE: ASPIRATIONS
-- Tables: aspiration → admission_result, passed_candidate
-- ============================================================

-- ------------------------------------------------------------
-- aspiration  (nguyện vọng)
-- ------------------------------------------------------------
CREATE TABLE aspiration (
    id                   SERIAL        PRIMARY KEY,
    candidate_id         UUID          NOT NULL REFERENCES candidate(id) ON DELETE CASCADE,
    major_combination_id INTEGER       NOT NULL REFERENCES major_combination(id) ON DELETE RESTRICT,
    rank                 SMALLINT      NOT NULL CHECK (rank >= 1),
    computed_score       NUMERIC(5, 2) NULL,
    action               actions       DEFAULT 'create',
    field_changed        VARCHAR(500)  NULL,
    create_date          TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    update_date          TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_aspiration_rank             UNIQUE (candidate_id, rank),
    CONSTRAINT uq_aspiration_major_combination UNIQUE (candidate_id, major_combination_id)
);

CREATE INDEX idx_aspiration_candidate         ON aspiration(candidate_id);
CREATE INDEX idx_aspiration_major_combination ON aspiration(major_combination_id);
CREATE INDEX idx_aspiration_score             ON aspiration(major_combination_id, computed_score);

CREATE TABLE aspiration_log (
    id                   SERIAL        PRIMARY KEY,
    aspiration_id        INTEGER       REFERENCES aspiration(id) ON DELETE CASCADE,
    candidate_id         UUID          NOT NULL,
    major_combination_id INTEGER       NOT NULL,
    rank                 SMALLINT      NOT NULL,
    computed_score       NUMERIC(5, 2) NULL,
    action               actions       NOT NULL,
    field_changed        VARCHAR(500)  NULL,
    create_date          TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

CREATE OR REPLACE FUNCTION set_aspiration()
RETURNS TRIGGER AS $$
DECLARE changed_fields TEXT := '';
BEGIN
    IF NEW.candidate_id         IS NOT NULL THEN changed_fields := changed_fields || 'candidate_id, ';         END IF;
    IF NEW.major_combination_id IS NOT NULL THEN changed_fields := changed_fields || 'major_combination_id, '; END IF;
    IF NEW.rank                 IS NOT NULL THEN changed_fields := changed_fields || 'rank, ';                 END IF;
    IF NEW.computed_score       IS NOT NULL THEN changed_fields := changed_fields || 'computed_score, ';       END IF;
    changed_fields    := RTRIM(changed_fields, ', ');
    NEW.action        := 'create';
    NEW.field_changed := changed_fields;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_aspiration
BEFORE INSERT ON aspiration
FOR EACH ROW EXECUTE FUNCTION set_aspiration();

CREATE OR REPLACE FUNCTION log_aspiration()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO aspiration_log (aspiration_id, candidate_id, major_combination_id, rank, computed_score, action, field_changed, create_date)
    VALUES (NEW.id, NEW.candidate_id, NEW.major_combination_id, NEW.rank, NEW.computed_score, NEW.action, NEW.field_changed, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_log_aspiration
AFTER INSERT ON aspiration
FOR EACH ROW EXECUTE FUNCTION log_aspiration();

CREATE OR REPLACE FUNCTION log_aspiration_update()
RETURNS TRIGGER AS $$
DECLARE changed_fields TEXT := '';
BEGIN
    IF NEW.rank           IS DISTINCT FROM OLD.rank           THEN changed_fields := changed_fields || 'rank, ';           END IF;
    IF NEW.computed_score IS DISTINCT FROM OLD.computed_score THEN changed_fields := changed_fields || 'computed_score, '; END IF;
    changed_fields    := RTRIM(changed_fields, ', ');
    NEW.action        := 'update';
    NEW.field_changed := changed_fields;
    NEW.update_date   := NOW();
    INSERT INTO aspiration_log (aspiration_id, candidate_id, major_combination_id, rank, computed_score, action, field_changed, create_date)
    VALUES (NEW.id, NEW.candidate_id, NEW.major_combination_id, NEW.rank, NEW.computed_score, 'update', changed_fields, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_log_aspiration_update
BEFORE UPDATE ON aspiration
FOR EACH ROW EXECUTE FUNCTION log_aspiration_update();


-- ------------------------------------------------------------
-- admission_result  (kết quả nhập học — 1:1 with aspiration)
-- ------------------------------------------------------------
CREATE TABLE admission_result (
    id            SERIAL                 PRIMARY KEY,
    aspiration_id INTEGER                NOT NULL UNIQUE REFERENCES aspiration(id) ON DELETE CASCADE,
    status        admission_status_enum  NOT NULL DEFAULT 'pending',
    admitted_at   TIMESTAMP              NULL,
    round         SMALLINT               NOT NULL DEFAULT 1,
    note          TEXT                   NOT NULL DEFAULT '',
    is_deleted    BOOLEAN                NOT NULL DEFAULT FALSE,
    deleted_at    TIMESTAMP              NULL,
    action        actions                DEFAULT 'create',
    field_changed VARCHAR(500)           NULL,
    create_date   TIMESTAMP              DEFAULT CURRENT_TIMESTAMP,
    update_date   TIMESTAMP              DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_admission_result_status ON admission_result(status, round);

CREATE TABLE admission_result_log (
    id                  SERIAL                PRIMARY KEY,
    admission_result_id INTEGER               REFERENCES admission_result(id) ON DELETE CASCADE,
    aspiration_id       INTEGER               NOT NULL,
    status              admission_status_enum NOT NULL,
    admitted_at         TIMESTAMP             NULL,
    round               SMALLINT              NOT NULL,
    note                TEXT                  NOT NULL,
    is_deleted          BOOLEAN               NOT NULL,
    deleted_at          TIMESTAMP             NULL,
    action              actions               NOT NULL,
    field_changed       VARCHAR(500)          NULL,
    create_date         TIMESTAMP             DEFAULT CURRENT_TIMESTAMP
);

CREATE OR REPLACE FUNCTION set_admission_result()
RETURNS TRIGGER AS $$
DECLARE changed_fields TEXT := '';
BEGIN
    IF NEW.aspiration_id IS NOT NULL THEN changed_fields := changed_fields || 'aspiration_id, '; END IF;
    IF NEW.status        IS NOT NULL THEN changed_fields := changed_fields || 'status, ';        END IF;
    IF NEW.round         IS NOT NULL THEN changed_fields := changed_fields || 'round, ';         END IF;
    IF NEW.note          IS NOT NULL THEN changed_fields := changed_fields || 'note, ';          END IF;
    changed_fields    := RTRIM(changed_fields, ', ');
    NEW.action        := 'create';
    NEW.field_changed := changed_fields;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_admission_result
BEFORE INSERT ON admission_result
FOR EACH ROW EXECUTE FUNCTION set_admission_result();

CREATE OR REPLACE FUNCTION log_admission_result()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO admission_result_log (admission_result_id, aspiration_id, status, admitted_at, round, note, is_deleted, deleted_at, action, field_changed, create_date)
    VALUES (NEW.id, NEW.aspiration_id, NEW.status, NEW.admitted_at, NEW.round, NEW.note, NEW.is_deleted, NEW.deleted_at, NEW.action, NEW.field_changed, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_log_admission_result
AFTER INSERT ON admission_result
FOR EACH ROW EXECUTE FUNCTION log_admission_result();

CREATE OR REPLACE FUNCTION log_admission_result_update()
RETURNS TRIGGER AS $$
DECLARE
    changed_fields TEXT    := '';
    new_action     actions := 'update';
BEGIN
    IF NEW.status      IS DISTINCT FROM OLD.status      THEN changed_fields := changed_fields || 'status, ';      END IF;
    IF NEW.admitted_at IS DISTINCT FROM OLD.admitted_at THEN changed_fields := changed_fields || 'admitted_at, '; END IF;
    IF NEW.round       IS DISTINCT FROM OLD.round       THEN changed_fields := changed_fields || 'round, ';       END IF;
    IF NEW.note        IS DISTINCT FROM OLD.note        THEN changed_fields := changed_fields || 'note, ';        END IF;
    IF NEW.is_deleted  IS DISTINCT FROM OLD.is_deleted THEN
        changed_fields := changed_fields || 'is_deleted, ';
        IF NEW.is_deleted = TRUE THEN
            new_action     := 'delete';
            NEW.deleted_at := NOW();
        END IF;
    END IF;
    -- Auto-set admitted_at when status changes to 'admitted'
    IF NEW.status = 'admitted' AND OLD.status IS DISTINCT FROM 'admitted' THEN
        NEW.admitted_at := NOW();
    END IF;
    changed_fields    := RTRIM(changed_fields, ', ');
    NEW.action        := new_action;
    NEW.field_changed := changed_fields;
    NEW.update_date   := NOW();
    INSERT INTO admission_result_log (admission_result_id, aspiration_id, status, admitted_at, round, note, is_deleted, deleted_at, action, field_changed, create_date)
    VALUES (NEW.id, NEW.aspiration_id, NEW.status, NEW.admitted_at, NEW.round, NEW.note, NEW.is_deleted, NEW.deleted_at, new_action, changed_fields, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_log_admission_result_update
BEFORE UPDATE ON admission_result
FOR EACH ROW EXECUTE FUNCTION log_admission_result_update();


-- ------------------------------------------------------------
-- passed_candidate  (thí sinh được bỏ qua / miễn xét)
-- ------------------------------------------------------------
CREATE TABLE passed_candidate (
    id                   SERIAL    PRIMARY KEY,
    candidate_id         UUID      NOT NULL REFERENCES candidate(id) ON DELETE CASCADE,
    major_combination_id INTEGER   NOT NULL REFERENCES major_combination(id) ON DELETE CASCADE,
    reason               TEXT      NOT NULL DEFAULT '',
    approved_by          UUID      NULL REFERENCES staff(id) ON DELETE SET NULL,
    action               actions   DEFAULT 'create',
    field_changed        VARCHAR(500) NULL,
    create_date          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    update_date          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_passed_candidate UNIQUE (candidate_id, major_combination_id)
);

CREATE TABLE passed_candidate_log (
    id                   SERIAL    PRIMARY KEY,
    passed_candidate_id  INTEGER   REFERENCES passed_candidate(id) ON DELETE CASCADE,
    candidate_id         UUID      NOT NULL,
    major_combination_id INTEGER   NOT NULL,
    reason               TEXT      NOT NULL,
    approved_by          UUID      NULL,
    action               actions   NOT NULL,
    field_changed        VARCHAR(500) NULL,
    create_date          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE OR REPLACE FUNCTION set_passed_candidate()
RETURNS TRIGGER AS $$
DECLARE changed_fields TEXT := '';
BEGIN
    IF NEW.candidate_id         IS NOT NULL THEN changed_fields := changed_fields || 'candidate_id, ';         END IF;
    IF NEW.major_combination_id IS NOT NULL THEN changed_fields := changed_fields || 'major_combination_id, '; END IF;
    IF NEW.reason               IS NOT NULL THEN changed_fields := changed_fields || 'reason, ';               END IF;
    IF NEW.approved_by          IS NOT NULL THEN changed_fields := changed_fields || 'approved_by, ';          END IF;
    changed_fields    := RTRIM(changed_fields, ', ');
    NEW.action        := 'create';
    NEW.field_changed := changed_fields;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_passed_candidate
BEFORE INSERT ON passed_candidate
FOR EACH ROW EXECUTE FUNCTION set_passed_candidate();

CREATE OR REPLACE FUNCTION log_passed_candidate()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO passed_candidate_log (passed_candidate_id, candidate_id, major_combination_id, reason, approved_by, action, field_changed, create_date)
    VALUES (NEW.id, NEW.candidate_id, NEW.major_combination_id, NEW.reason, NEW.approved_by, NEW.action, NEW.field_changed, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_log_passed_candidate
AFTER INSERT ON passed_candidate
FOR EACH ROW EXECUTE FUNCTION log_passed_candidate();

CREATE OR REPLACE FUNCTION log_passed_candidate_update()
RETURNS TRIGGER AS $$
DECLARE changed_fields TEXT := '';
BEGIN
    IF NEW.reason      IS DISTINCT FROM OLD.reason      THEN changed_fields := changed_fields || 'reason, ';      END IF;
    IF NEW.approved_by IS DISTINCT FROM OLD.approved_by THEN changed_fields := changed_fields || 'approved_by, '; END IF;
    changed_fields    := RTRIM(changed_fields, ', ');
    NEW.action        := 'update';
    NEW.field_changed := changed_fields;
    NEW.update_date   := NOW();
    INSERT INTO passed_candidate_log (passed_candidate_id, candidate_id, major_combination_id, reason, approved_by, action, field_changed, create_date)
    VALUES (NEW.id, NEW.candidate_id, NEW.major_combination_id, NEW.reason, NEW.approved_by, 'update', changed_fields, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_log_passed_candidate_update
BEFORE UPDATE ON passed_candidate
FOR EACH ROW EXECUTE FUNCTION log_passed_candidate_update();


-- ============================================================
-- SERVICE: ANALYTICS
-- Tables: percentile_snapshot
-- ============================================================

CREATE TABLE percentile_snapshot (
    id                   SERIAL        PRIMARY KEY,
    major_combination_id INTEGER       NOT NULL REFERENCES major_combination(id) ON DELETE CASCADE,
    percentile           SMALLINT      NOT NULL CHECK (percentile BETWEEN 0 AND 100),
    score                NUMERIC(5, 2) NOT NULL,
    round                SMALLINT      NOT NULL DEFAULT 1,
    computed_at          TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    action               actions       DEFAULT 'create',
    field_changed        VARCHAR(500)  NULL,
    create_date          TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    update_date          TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_percentile_snapshot UNIQUE (major_combination_id, percentile, round)
);

CREATE INDEX idx_percentile_snapshot_combination ON percentile_snapshot(major_combination_id, round);

CREATE TABLE percentile_snapshot_log (
    id                      SERIAL        PRIMARY KEY,
    percentile_snapshot_id  INTEGER       REFERENCES percentile_snapshot(id) ON DELETE CASCADE,
    major_combination_id    INTEGER       NOT NULL,
    percentile              SMALLINT      NOT NULL,
    score                   NUMERIC(5, 2) NOT NULL,
    round                   SMALLINT      NOT NULL,
    computed_at             TIMESTAMP     NOT NULL,
    action                  actions       NOT NULL,
    field_changed           VARCHAR(500)  NULL,
    create_date             TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

CREATE OR REPLACE FUNCTION set_percentile_snapshot()
RETURNS TRIGGER AS $$
DECLARE changed_fields TEXT := '';
BEGIN
    IF NEW.major_combination_id IS NOT NULL THEN changed_fields := changed_fields || 'major_combination_id, '; END IF;
    IF NEW.percentile           IS NOT NULL THEN changed_fields := changed_fields || 'percentile, ';           END IF;
    IF NEW.score                IS NOT NULL THEN changed_fields := changed_fields || 'score, ';                END IF;
    IF NEW.round                IS NOT NULL THEN changed_fields := changed_fields || 'round, ';                END IF;
    changed_fields    := RTRIM(changed_fields, ', ');
    NEW.action        := 'create';
    NEW.field_changed := changed_fields;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_percentile_snapshot
BEFORE INSERT ON percentile_snapshot
FOR EACH ROW EXECUTE FUNCTION set_percentile_snapshot();

CREATE OR REPLACE FUNCTION log_percentile_snapshot()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO percentile_snapshot_log (percentile_snapshot_id, major_combination_id, percentile, score, round, computed_at, action, field_changed, create_date)
    VALUES (NEW.id, NEW.major_combination_id, NEW.percentile, NEW.score, NEW.round, NEW.computed_at, NEW.action, NEW.field_changed, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_log_percentile_snapshot
AFTER INSERT ON percentile_snapshot
FOR EACH ROW EXECUTE FUNCTION log_percentile_snapshot();

CREATE OR REPLACE FUNCTION log_percentile_snapshot_update()
RETURNS TRIGGER AS $$
DECLARE changed_fields TEXT := '';
BEGIN
    IF NEW.score IS DISTINCT FROM OLD.score THEN changed_fields := changed_fields || 'score, '; END IF;
    IF NEW.round IS DISTINCT FROM OLD.round THEN changed_fields := changed_fields || 'round, '; END IF;
    changed_fields    := RTRIM(changed_fields, ', ');
    NEW.action        := 'update';
    NEW.field_changed := changed_fields;
    NEW.update_date   := NOW();
    NEW.computed_at   := NOW();
    INSERT INTO percentile_snapshot_log (percentile_snapshot_id, major_combination_id, percentile, score, round, computed_at, action, field_changed, create_date)
    VALUES (NEW.id, NEW.major_combination_id, NEW.percentile, NEW.score, NEW.round, NEW.computed_at, 'update', changed_fields, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_log_percentile_snapshot_update
BEFORE UPDATE ON percentile_snapshot
FOR EACH ROW EXECUTE FUNCTION log_percentile_snapshot_update();
