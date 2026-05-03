CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated;

ALTER POLICY "admins view all profiles"
ON public.profiles
USING (private.has_role(auth.uid(), 'admin'::public.app_role));

ALTER POLICY "admins view all subscriptions"
ON public.subscriptions
USING (private.has_role(auth.uid(), 'admin'::public.app_role));

ALTER POLICY "admins view all roles"
ON public.user_roles
USING (private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE OR REPLACE FUNCTION public.enforce_admin_unlimited()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.email = 'stefanmaestro25@gmail.com' OR private.has_role(NEW.id, 'admin'::app_role) THEN
    NEW.unlimited := true;
    NEW.plan := 'elite'::plan_tier;
    IF NEW.credits < 999999 THEN NEW.credits := 999999; END IF;
    IF NEW.monthly_credits < 999999 THEN NEW.monthly_credits := 999999; END IF;
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM authenticated;