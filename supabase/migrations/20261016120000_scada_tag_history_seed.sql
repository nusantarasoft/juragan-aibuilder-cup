-- Historian sample points for QA tenant (SCADA trends GraphQL)

DELETE FROM scada_tag_values
WHERE tag_id IN (
    '88888888-8888-8888-8888-888888888881'::uuid,
    '88888888-8888-8888-8888-888888888882'::uuid
);

INSERT INTO scada_tag_values (tag_id, timestamp, value_numeric, quality)
SELECT
    '88888888-8888-8888-8888-888888888881'::uuid,
    NOW() - (n || ' minutes')::interval,
    22.0 + sin(n / 6.0) * 2.5 + CASE WHEN n < 10 THEN n * 0.15 ELSE 0 END,
    'good'
FROM generate_series(0, 59) AS n;

INSERT INTO scada_tag_values (tag_id, timestamp, value_numeric, quality)
SELECT
    '88888888-8888-8888-8888-888888888882'::uuid,
    NOW() - (n || ' minutes')::interval,
    48.0 + cos(n / 5.0) * 4.0,
    'good'
FROM generate_series(0, 59) AS n;
