CREATE OR REPLACE FUNCTION fn_sync_bed_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN

    IF TG_OP = 'INSERT' THEN
        IF NEW.bed_id IS NOT NULL THEN
            UPDATE beds SET is_occupied = TRUE WHERE id = NEW.bed_id;
        END IF;
        RETURN NEW;
    END IF;

    IF TG_OP = 'UPDATE' THEN

        IF NEW.status IN ('discharged', 'deceased') AND OLD.status = 'active' THEN
            IF OLD.bed_id IS NOT NULL THEN
                UPDATE beds SET is_occupied = FALSE WHERE id = OLD.bed_id;
            END IF;
        END IF;

        IF OLD.bed_id IS DISTINCT FROM NEW.bed_id THEN
            IF OLD.bed_id IS NOT NULL THEN
                UPDATE beds SET is_occupied = FALSE WHERE id = OLD.bed_id;
            END IF;
            IF NEW.bed_id IS NOT NULL THEN
                UPDATE beds SET is_occupied = TRUE WHERE id = NEW.bed_id;
            END IF;
        END IF;

        RETURN NEW;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bed_status_on_admission ON admissions;
CREATE TRIGGER trg_bed_status_on_admission
    AFTER INSERT OR UPDATE ON admissions
    FOR EACH ROW
    EXECUTE FUNCTION fn_sync_bed_status();

COMMENT ON FUNCTION fn_sync_bed_status IS
    'Keeps beds.is_occupied in sync with admissions (INSERT = occupy, discharge/death = free)';
