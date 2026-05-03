-- Storage bucket for generated assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('generations', 'generations', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "public read generations"
ON storage.objects FOR SELECT
USING (bucket_id = 'generations');

CREATE POLICY "users upload own generations"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'generations' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "users delete own generations files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'generations' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Subscriptions
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  stripe_customer_id text,
  stripe_subscription_id text UNIQUE,
  plan plan_tier NOT NULL DEFAULT 'free',
  status text NOT NULL DEFAULT 'inactive',
  current_period_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users view own subscription"
ON public.subscriptions FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "admins view all subscriptions"
ON public.subscriptions FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'));

ALTER TABLE public.profiles ADD COLUMN monthly_credits int NOT NULL DEFAULT 3;

-- Grant credits per plan (called by the Stripe webhook)
CREATE OR REPLACE FUNCTION public.grant_plan_credits(_user_id uuid, _plan plan_tier)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  allowance int;
BEGIN
  allowance := CASE _plan
    WHEN 'free' THEN 3
    WHEN 'basic' THEN 100
    WHEN 'pro' THEN 400
    WHEN 'elite' THEN 1000
  END;
  UPDATE public.profiles
  SET plan = _plan,
      monthly_credits = allowance,
      credits = GREATEST(credits, allowance),
      updated_at = now()
  WHERE id = _user_id AND unlimited = false;
END;
$$;