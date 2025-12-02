-- Enable Realtime for tenant data tables
-- These tables will broadcast changes to connected clients

-- Add tables to the supabase_realtime publication
-- (supabase_realtime is the default publication for Realtime)

-- Check if publication exists first (Supabase creates it automatically)
DO $$
BEGIN
  -- taxonomy_nodes
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'taxonomy_nodes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.taxonomy_nodes;
  END IF;

  -- controls
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'controls'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.controls;
  END IF;

  -- control_links
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'control_links'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.control_links;
  END IF;

  -- rct_rows
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'rct_rows'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.rct_rows;
  END IF;

  -- pending_changes
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'pending_changes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.pending_changes;
  END IF;
END $$;

COMMENT ON TABLE public.taxonomy_nodes IS 'Realtime enabled for cross-user sync';
COMMENT ON TABLE public.controls IS 'Realtime enabled for cross-user sync';
COMMENT ON TABLE public.control_links IS 'Realtime enabled for cross-user sync';
COMMENT ON TABLE public.rct_rows IS 'Realtime enabled for cross-user sync';
COMMENT ON TABLE public.pending_changes IS 'Realtime enabled for cross-user sync';
