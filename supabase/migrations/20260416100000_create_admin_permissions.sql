-- Migration: Create Admin Permissions for Super Admin Menu System

CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS admin_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    module_name TEXT NOT NULL,
    is_enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(admin_id, module_name)
);

-- Enable Row Level Security
ALTER TABLE admin_permissions ENABLE ROW LEVEL SECURITY;

-- Policy: Only super admins can manage all permissions
CREATE POLICY "Super admins can manage all admin permissions"
    ON admin_permissions
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super'
        )
    );

-- Policy: Users can view their own permissions
CREATE POLICY "Users can view their own permissions"
    ON admin_permissions
    FOR SELECT
    USING (admin_id = auth.uid());

-- Trigger for auto-updating updated_at
CREATE TRIGGER set_admin_permissions_updated_at
    BEFORE UPDATE ON admin_permissions
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

-- Add a comment to the table
COMMENT ON TABLE admin_permissions IS 'Stores per-module tab visibility capabilities customized by super admins for individual admin users.';
