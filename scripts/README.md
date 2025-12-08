# Scripts Directory

This directory contains utility scripts for database maintenance and testing.

## Cleanup Scripts (`cleanup/`)

These are one-time SQL scripts used for database cleanup and maintenance:

- **CHECK-*.sql** - Diagnostic queries to inspect database state
- **CLEANUP-*.sql** - Scripts to clean up old/corrupted data
- **DELETE-*.sql** - Scripts to remove specific problematic entries
- **SAFE-CLEANUP.sql** - Safe cleanup operations with validation
- **TEST-*.sql** - Test queries for debugging

### Usage

1. Copy the SQL from the desired script
2. Run it in your Supabase SQL Editor
3. Review the results before running any DELETE operations

### Note

These scripts were used during development to fix data issues and are kept for reference.
They should NOT be run automatically or added to the migration pipeline.
