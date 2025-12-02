-- Migration: 00035_test_steps.sql
-- Purpose: Add structured test steps to controls and step responses to control tests
-- Phase: 45-control-test-steps
-- Dependencies: 00015_controls.sql, 00018_control_tests.sql

-- Add test_steps JSONB column to controls table
-- This is NULLABLE - controls without steps continue using test_procedure TEXT
ALTER TABLE public.controls
ADD COLUMN test_steps JSONB DEFAULT NULL;

COMMENT ON COLUMN public.controls.test_steps IS
  'JSONB array of test step definitions: [{id, label, inputType, options, required, helpText, order}]. inputType: text|binary|multiple_choice|number|date';

-- Add step_responses JSONB column to control_tests table
-- Records tester responses for each step during test execution
ALTER TABLE public.control_tests
ADD COLUMN step_responses JSONB DEFAULT NULL;

COMMENT ON COLUMN public.control_tests.step_responses IS
  'JSONB array of step responses: [{stepId, value, cannotRecord, cannotRecordReason, evidenceUrl, recordedAt}]';

-- Create index for querying controls with defined steps
-- Useful for filtering controls that have structured test procedures
CREATE INDEX idx_controls_has_steps ON public.controls ((test_steps IS NOT NULL));
