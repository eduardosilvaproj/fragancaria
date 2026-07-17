-- 20260717_customer_identity_repair.sql
--
-- Repara a identidade de clientes e pedidos:
--   1. normaliza e-mails;
--   2. mescla customers duplicados do mesmo e-mail;
--   3. cria customers para compradores históricos;
--   4. vincula pedidos guest à conta criada com o mesmo e-mail;
--   5. impede novas duplicatas com índice único normalizado.
--
-- APLICAR MANUALMENTE no SQL Editor do projeto Fragranciaria
-- (gzxlupgdmrtkprwhiutp), depois de revisar o SQL completo.

BEGIN;

-- Nunca mesclar automaticamente duas identidades autenticadas diferentes.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.customers
    WHERE email IS NOT NULL AND btrim(email) <> ''
    GROUP BY lower(btrim(email))
    HAVING count(DISTINCT auth_user_id) FILTER (WHERE auth_user_id IS NOT NULL) > 1
  ) THEN
    RAISE EXCEPTION
      'Existem e-mails vinculados a mais de uma conta auth; revise as duplicatas antes de aplicar esta migration.';
  END IF;
END
$$;

-- A mesma forma canônica de e-mail é usada no checkout e no vínculo de conta.
UPDATE public.customers
SET email = lower(btrim(email))
WHERE email IS NOT NULL
  AND email <> lower(btrim(email));

UPDATE public.orders
SET customer_email = lower(btrim(customer_email))
WHERE customer_email IS NOT NULL
  AND customer_email <> lower(btrim(customer_email));

-- Para cada duplicata, escolhe a linha com auth_user_id; sem conta, a mais antiga.
CREATE TEMP TABLE customer_duplicates ON COMMIT DROP AS
SELECT
  duplicate.id AS duplicate_id,
  canonical.id AS canonical_id
FROM public.customers AS duplicate
JOIN LATERAL (
  SELECT candidate.id
  FROM public.customers AS candidate
  WHERE candidate.email IS NOT NULL
    AND lower(btrim(candidate.email)) = lower(btrim(duplicate.email))
  ORDER BY (candidate.auth_user_id IS NOT NULL) DESC, candidate.created_at ASC, candidate.id ASC
  LIMIT 1
) AS canonical ON true
WHERE duplicate.email IS NOT NULL
  AND btrim(duplicate.email) <> ''
  AND duplicate.id <> canonical.id;

-- Completa a linha canônica com os melhores dados já armazenados nas duplicatas.
WITH duplicate_values AS (
  SELECT
    d.canonical_id,
    (array_agg(NULLIF(c.name, '') ORDER BY c.created_at ASC)
      FILTER (WHERE NULLIF(c.name, '') IS NOT NULL))[1] AS name,
    (array_agg(NULLIF(c.phone, '') ORDER BY c.created_at ASC)
      FILTER (WHERE NULLIF(c.phone, '') IS NOT NULL))[1] AS phone,
    (array_agg(NULLIF(c.cpf, '') ORDER BY c.created_at ASC)
      FILTER (WHERE NULLIF(c.cpf, '') IS NOT NULL))[1] AS cpf,
    (array_agg(c.birth_date ORDER BY c.created_at ASC)
      FILTER (WHERE c.birth_date IS NOT NULL))[1] AS birth_date,
    bool_or(c.blocked) AS blocked,
    max(c.blocked_at) AS blocked_at,
    (array_agg(NULLIF(c.blocked_reason, '') ORDER BY c.created_at DESC)
      FILTER (WHERE NULLIF(c.blocked_reason, '') IS NOT NULL))[1] AS blocked_reason,
    max(c.loyalty_points) AS loyalty_points,
    max(
      CASE c.loyalty_tier
        WHEN 'platinum' THEN 4
        WHEN 'gold' THEN 3
        WHEN 'silver' THEN 2
        ELSE 1
      END
    ) AS loyalty_rank
  FROM customer_duplicates AS d
  JOIN public.customers AS c ON c.id = d.duplicate_id
  GROUP BY d.canonical_id
)
UPDATE public.customers AS canonical
SET
  name = COALESCE(NULLIF(canonical.name, ''), values.name),
  phone = COALESCE(NULLIF(canonical.phone, ''), values.phone),
  cpf = COALESCE(NULLIF(canonical.cpf, ''), values.cpf),
  birth_date = COALESCE(canonical.birth_date, values.birth_date),
  blocked = canonical.blocked OR COALESCE(values.blocked, false),
  blocked_at = COALESCE(canonical.blocked_at, values.blocked_at),
  blocked_reason = COALESCE(NULLIF(canonical.blocked_reason, ''), values.blocked_reason),
  loyalty_points = GREATEST(canonical.loyalty_points, COALESCE(values.loyalty_points, 0)),
  loyalty_tier = CASE GREATEST(
    CASE canonical.loyalty_tier
      WHEN 'platinum' THEN 4
      WHEN 'gold' THEN 3
      WHEN 'silver' THEN 2
      ELSE 1
    END,
    COALESCE(values.loyalty_rank, 1)
  )
    WHEN 4 THEN 'platinum'
    WHEN 3 THEN 'gold'
    WHEN 2 THEN 'silver'
    ELSE 'bronze'
  END
FROM duplicate_values AS values
WHERE canonical.id = values.canonical_id;

-- Mantém referências internas antes de apagar as linhas duplicadas.
DO $$
BEGIN
  IF to_regclass('public.customer_notes') IS NOT NULL THEN
    UPDATE public.customer_notes AS notes
    SET customer_id = duplicates.canonical_id
    FROM customer_duplicates AS duplicates
    WHERE notes.customer_id = duplicates.duplicate_id;
  END IF;

  IF to_regclass('public.product_reviews') IS NOT NULL THEN
    UPDATE public.product_reviews AS reviews
    SET customer_id = duplicates.canonical_id
    FROM customer_duplicates AS duplicates
    WHERE reviews.customer_id = duplicates.duplicate_id;
  END IF;
END
$$;

DELETE FROM public.customers AS customer
USING customer_duplicates AS duplicates
WHERE customer.id = duplicates.duplicate_id;

CREATE UNIQUE INDEX IF NOT EXISTS uq_customers_email_normalized
  ON public.customers (lower(btrim(email)))
  WHERE email IS NOT NULL AND btrim(email) <> '';

-- Cria perfil interno para compradores antigos que ainda só existiam em orders.
INSERT INTO public.customers (email, name, phone, cpf)
SELECT DISTINCT ON (lower(btrim(order_row.customer_email)))
  lower(btrim(order_row.customer_email)),
  NULLIF(btrim(order_row.customer_name), ''),
  NULLIF(btrim(order_row.customer_phone), ''),
  NULLIF(btrim(order_row.customer_cpf), '')
FROM public.orders AS order_row
WHERE order_row.customer_email IS NOT NULL
  AND btrim(order_row.customer_email) <> ''
  AND NOT EXISTS (
    SELECT 1
    FROM public.customers AS customer
    WHERE lower(btrim(customer.email)) = lower(btrim(order_row.customer_email))
  )
ORDER BY lower(btrim(order_row.customer_email)), order_row.created_at ASC;

-- Completa dados de perfis existentes com o pedido mais recente que os tenha.
WITH latest_order_data AS (
  SELECT DISTINCT ON (lower(btrim(customer_email)))
    lower(btrim(customer_email)) AS email,
    NULLIF(btrim(customer_name), '') AS name,
    NULLIF(btrim(customer_phone), '') AS phone,
    NULLIF(btrim(customer_cpf), '') AS cpf
  FROM public.orders
  WHERE customer_email IS NOT NULL AND btrim(customer_email) <> ''
  ORDER BY lower(btrim(customer_email)), created_at DESC
)
UPDATE public.customers AS customer
SET
  name = COALESCE(NULLIF(customer.name, ''), latest.name),
  phone = COALESCE(NULLIF(customer.phone, ''), latest.phone),
  cpf = COALESCE(NULLIF(customer.cpf, ''), latest.cpf)
FROM latest_order_data AS latest
WHERE lower(btrim(customer.email)) = latest.email;

-- Reata pedidos antigos de clientes que já possuem conta de acesso.
UPDATE public.orders AS order_row
SET auth_user_id = customer.auth_user_id
FROM public.customers AS customer
WHERE order_row.auth_user_id IS NULL
  AND customer.auth_user_id IS NOT NULL
  AND order_row.customer_email IS NOT NULL
  AND lower(btrim(order_row.customer_email)) = lower(btrim(customer.email));

-- O trigger antigo só escutava UPDATE. Cadastro posterior é INSERT, então os
-- pedidos guest nunca eram vinculados. Ambos os eventos agora usam a mesma função.
CREATE OR REPLACE FUNCTION public.sync_orders_to_auth_user()
RETURNS TRIGGER AS $_$
BEGIN
  IF NEW.auth_user_id IS NOT NULL
    AND NEW.email IS NOT NULL
    AND (TG_OP = 'INSERT' OR OLD.auth_user_id IS DISTINCT FROM NEW.auth_user_id) THEN
    UPDATE public.orders
    SET auth_user_id = NEW.auth_user_id
    WHERE auth_user_id IS NULL
      AND customer_email IS NOT NULL
      AND lower(btrim(customer_email)) = lower(btrim(NEW.email));
  END IF;
  RETURN NEW;
END;
$_$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_orders_to_auth_user ON public.customers;
DROP TRIGGER IF EXISTS trg_sync_orders_to_auth_user_insert ON public.customers;
DROP TRIGGER IF EXISTS trg_sync_orders_to_auth_user_update ON public.customers;

CREATE TRIGGER trg_sync_orders_to_auth_user_insert
  AFTER INSERT ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.sync_orders_to_auth_user();

CREATE TRIGGER trg_sync_orders_to_auth_user_update
  AFTER UPDATE OF auth_user_id ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.sync_orders_to_auth_user();

-- `orders_select_own` consulta a coluna legada user_id, que o checkout não usa.
-- A policy válida é orders_select_auth (auth_user_id OU customer_email).
DROP POLICY IF EXISTS orders_select_own ON public.orders;
GRANT SELECT ON public.orders TO authenticated;

COMMIT;
