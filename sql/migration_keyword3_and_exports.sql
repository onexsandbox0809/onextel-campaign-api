-- Run this once against the existing Supabase database.
-- Adds Keyword 3 Reason (Other may already exist), then rebuilds the
-- consolidated view so Keyword 3 reason/other appear correctly.

ALTER TABLE public.keyword3_responses
  ADD COLUMN IF NOT EXISTS reason text,
  ADD COLUMN IF NOT EXISTS other text;

DROP VIEW IF EXISTS public.consolidated_report;

CREATE VIEW public.consolidated_report AS
  SELECT
    'keyword1' AS source_table,
    id,
    mobile_number,
    keyword1 AS keyword,
    NULL::text AS reason,
    NULL::text AS other,
    response_date,
    response_time,
    created_at
  FROM public.keyword1_responses

  UNION ALL

  SELECT
    'keyword2' AS source_table,
    id,
    mobile_number,
    keyword2 AS keyword,
    reason,
    other,
    response_date,
    response_time,
    created_at
  FROM public.keyword2_responses

  UNION ALL

  SELECT
    'keyword3' AS source_table,
    id,
    mobile_number,
    keyword3 AS keyword,
    reason,
    other,
    response_date,
    response_time,
    created_at
  FROM public.keyword3_responses

  UNION ALL

  SELECT
    'keyword_selected' AS source_table,
    id,
    mobile_number,
    keyword_selected AS keyword,
    reason,
    other,
    response_date,
    response_time,
    created_at
  FROM public.keyword_selected_responses;
