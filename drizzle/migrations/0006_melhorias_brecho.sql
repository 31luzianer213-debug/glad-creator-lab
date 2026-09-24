UPDATE public.produtos SET categoria = CASE categoria WHEN 'adulto' THEN 'adult' WHEN 'infantil' THEN 'children' WHEN 'acessorios' THEN 'shoes' ELSE categoria END;
ALTER TABLE public.produtos DROP CONSTRAINT produtos_categoria_chk;
ALTER TABLE public.produtos ADD CONSTRAINT produtos_categoria_chk CHECK (categoria = ANY (ARRAY['adult','children','shoes']));

CREATE OR REPLACE FUNCTION public.consultar_reserva(_id uuid)
RETURNS TABLE(status text, "codigoProduto" text, "nomeProduto" text, "createdAt" timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT r.status, r."codigoProduto", r."nomeProduto", r."createdAt" FROM public.reservas r WHERE r.id = _id
$$;
REVOKE EXECUTE ON FUNCTION public.consultar_reserva(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.consultar_reserva(uuid) TO anon, authenticated;

CREATE POLICY "Fotos publicas" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'fotos-produtos');
CREATE POLICY "Admin envia fotos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'fotos-produtos' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin atualiza fotos" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'fotos-produtos' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin exclui fotos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'fotos-produtos' AND public.has_role(auth.uid(), 'admin'));
