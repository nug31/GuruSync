/*
  # Add NIK to Email Resolver RPC
  
  This migration adds a secure way to resolve a NIK to an email address
  without exposing sensitive tables to anonymous users via RLS.
*/

CREATE OR REPLACE FUNCTION resolve_nik_to_email(p_nik text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with the privileges of the creator (usually postgres)
SET search_path = public
AS $$
DECLARE
    v_email text;
BEGIN
    -- 1. Check profiles (Admins)
    SELECT email INTO v_email FROM profiles WHERE nik = p_nik LIMIT 1;
    IF v_email IS NOT NULL THEN
        RETURN v_email;
    END IF;
    
    -- 2. Check teachers (Teachers)
    SELECT email INTO v_email FROM teachers WHERE nik = p_nik LIMIT 1;
    RETURN v_email;
END;
$$;

-- Grant permissions to allow unauthenticated users to call this
GRANT EXECUTE ON FUNCTION resolve_nik_to_email(text) TO anon, authenticated;
