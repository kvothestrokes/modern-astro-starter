-- Migration: make customers.phone unique.
-- Run in Supabase SQL Editor. Multiple rows with phone = NULL are allowed; non-NULL phones must be unique.
-- If the constraint already exists, this will fail; drop it first or skip.

ALTER TABLE customers
  ADD CONSTRAINT customers_phone_unique UNIQUE (phone);
