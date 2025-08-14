-- Update participants.status check constraint to include pending and denied
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'participants' AND column_name = 'status'
  ) THEN
    -- Attempt to drop existing constraint by finding its name dynamically
    EXECUTE (
      SELECT 'ALTER TABLE participants DROP CONSTRAINT ' || quote_ident(tc.constraint_name)
      FROM information_schema.table_constraints tc
      JOIN information_schema.constraint_column_usage ccu
        ON tc.constraint_name = ccu.constraint_name
      WHERE tc.table_name = 'participants'
        AND tc.constraint_type = 'CHECK'
        AND ccu.column_name = 'status'
      LIMIT 1
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- ignore if no such constraint
  NULL;
END $$;

ALTER TABLE participants
  ADD CONSTRAINT participants_status_check
  CHECK (status IN ('pending','joined','waitlist','denied'));


