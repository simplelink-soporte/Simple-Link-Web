-- Script para encontrar referencias a rental_start_time
-- Buscar en funciones
SELECT 
    n.nspname as schema_name,
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE pg_get_functiondef(p.oid) LIKE '%rental_start_time%'
AND n.nspname NOT IN ('pg_catalog', 'information_schema');

-- Buscar en triggers
SELECT 
    tg.tgname as trigger_name,
    tab.relname as table_name,
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_trigger tg
JOIN pg_class tab ON tg.tgrelid = tab.oid
JOIN pg_proc p ON tg.tgfoid = p.oid
JOIN pg_namespace n ON tab.relnamespace = n.oid
WHERE pg_get_functiondef(p.oid) LIKE '%rental_start_time%'
AND n.nspname NOT IN ('pg_catalog', 'information_schema');

-- Buscar en vistas
SELECT 
    viewname,
    definition
FROM pg_views
WHERE definition LIKE '%rental_start_time%'
AND schemaname NOT IN ('pg_catalog', 'information_schema'); 