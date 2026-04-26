from django.db import migrations

TRIGGER_FUNC_SQL = """
CREATE OR REPLACE FUNCTION generate_candidate_ticket_number()
RETURNS TRIGGER AS $$
DECLARE
    v_year     text;
    v_seq_name text;
    v_seq      bigint;
BEGIN
    -- Skip generation when ticket_number already provided (e.g. Excel import)
    IF NEW.ticket_number IS NOT NULL THEN
        RETURN NEW;
    END IF;

    v_year     := EXTRACT(YEAR FROM NOW())::int::text;
    v_seq_name := 'candidate_ticket_seq_' || v_year;

    -- Create year-scoped sequence on first use; safe under concurrent inserts
    EXECUTE format(
        'CREATE SEQUENCE IF NOT EXISTS %I START 1 INCREMENT 1 NO CYCLE',
        v_seq_name
    );

    -- O(1) atomic fetch — not a table scan
    EXECUTE format('SELECT nextval(%L)', v_seq_name) INTO v_seq;

    NEW.ticket_number := 'TS.' || v_year || '.' || lpad(v_seq::text, 4, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
"""

CREATE_TRIGGER_SQL = """
CREATE TRIGGER trg_candidate_ticket_number
    BEFORE INSERT ON candidate
    FOR EACH ROW
    EXECUTE FUNCTION generate_candidate_ticket_number();
"""

DROP_TRIGGER_SQL = "DROP TRIGGER IF EXISTS trg_candidate_ticket_number ON candidate;"
DROP_FUNC_SQL    = "DROP FUNCTION IF EXISTS generate_candidate_ticket_number();"


class Migration(migrations.Migration):

    dependencies = [
        ('candidates', '0003_initial'),
    ]

    operations = [
        migrations.RunSQL(
            sql     = TRIGGER_FUNC_SQL + CREATE_TRIGGER_SQL,
            reverse_sql = DROP_TRIGGER_SQL + DROP_FUNC_SQL,
        ),
    ]
