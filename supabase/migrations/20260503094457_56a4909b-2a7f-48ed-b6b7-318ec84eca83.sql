
-- Ensure the admin account is always unlimited and elite
UPDATE public.profiles
SET unlimited = true, plan = 'elite', credits = GREATEST(credits, 999999), monthly_credits = GREATEST(monthly_credits, 999999)
WHERE email = 'stefanmaestro25@gmail.com';

-- Make sure admin has the admin role
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM public.profiles WHERE email = 'stefanmaestro25@gmail.com'
ON CONFLICT DO NOTHING;

-- Trigger function: force admin profile to remain unlimited on any update
CREATE OR REPLACE FUNCTION public.enforce_admin_unlimited()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email = 'stefanmaestro25@gmail.com' OR public.has_role(NEW.id, 'admin'::app_role) THEN
    NEW.unlimited := true;
    NEW.plan := 'elite'::plan_tier;
    IF NEW.credits < 999999 THEN NEW.credits := 999999; END IF;
    IF NEW.monthly_credits < 999999 THEN NEW.monthly_credits := 999999; END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_admin_unlimited_trigger ON public.profiles;
CREATE TRIGGER enforce_admin_unlimited_trigger
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.enforce_admin_unlimited();
