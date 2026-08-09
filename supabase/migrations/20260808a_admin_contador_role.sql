ALTER TABLE public.admins DROP CONSTRAINT IF EXISTS admins_role_check;
ALTER TABLE public.admins ADD CONSTRAINT admins_role_check CHECK (role IN ('total', 'social', 'logistica', 'contador'));

UPDATE public.admins SET role = 'total' WHERE role IS NULL OR role NOT IN ('total', 'social', 'logistica', 'contador');

-- Verificação
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_name = 'admins_role_check';
