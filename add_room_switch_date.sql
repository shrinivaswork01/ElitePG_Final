-- Migration: Add room_switch_date to tenants table
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS room_switch_date DATE;
