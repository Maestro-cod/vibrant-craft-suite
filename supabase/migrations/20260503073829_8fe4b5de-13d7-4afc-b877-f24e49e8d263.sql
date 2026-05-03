-- Restrict storage object listing on generations bucket to owner only
DROP POLICY IF EXISTS "public read generations" ON storage.objects;
CREATE POLICY "owner list generations"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'generations'
  AND (auth.uid() IS NOT NULL AND auth.uid()::text = (storage.foldername(name))[1])
);
-- Public access still works because the bucket is public (objects served via public URL),
-- but listing/searching is restricted to owners.

REVOKE EXECUTE ON FUNCTION public.grant_plan_credits(uuid, plan_tier) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;