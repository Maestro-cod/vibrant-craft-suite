ALTER TABLE public.generations
ALTER COLUMN metadata SET DEFAULT jsonb_build_object('status', 'completed');

DROP POLICY IF EXISTS "users update own generations" ON public.generations;
CREATE POLICY "users update own generations"
ON public.generations
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);