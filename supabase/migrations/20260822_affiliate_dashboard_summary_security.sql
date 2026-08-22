-- Corrige o erro 42501 (permission denied for view affiliate_dashboard_summary)
-- mantendo a estrutura atual da view intacta, ativando security_invoker para respeitar RLS
-- e concedendo select para authenticated e service_role.

ALTER VIEW affiliate_dashboard_summary SET (security_invoker = true);

GRANT SELECT ON affiliate_dashboard_summary TO authenticated;
GRANT SELECT ON affiliate_dashboard_summary TO service_role;
