-- Migration: Complete agents table schema
-- This ensures all columns used by the backend exist in the agents table.
-- Run this in your Supabase SQL Editor.

-- 1. Add missing metadata columns
ALTER TABLE agents
  ADD COLUMN IF NOT EXISTS system_prompt TEXT,
  ADD COLUMN IF NOT EXISTS enabled_tools TEXT[],
  ADD COLUMN IF NOT EXISTS wallet_address TEXT,
  ADD COLUMN IF NOT EXISTS api_key_hash TEXT,
  ADD COLUMN IF NOT EXISTS api_key_prefix TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;

-- 2. Ensure existing columns have correct types/defaults if needed
-- (Assuming id, user_id, name, description, api_key, tools, status already exist)

-- 3. Create indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_agents_wallet_address ON agents(wallet_address);
CREATE INDEX IF NOT EXISTS idx_agents_is_public ON agents(is_public);

-- 4. Verify
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'agents'
ORDER BY ordinal_position;
