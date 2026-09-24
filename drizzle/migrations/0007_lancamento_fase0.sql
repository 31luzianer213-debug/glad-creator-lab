-- ===== Envio público só pelo servidor (anti-spam) =====
DROP POLICY IF EXISTS "Qualquer um solicita reserva" ON public.reservas;
DROP POLICY IF EXISTS "Qualquer um avalia" ON public.avaliacoes;
REVOKE INSERT ON public.reservas FROM anon, authenticated;
REVOKE INSERT ON public.avaliacoes FROM anon, authenticated;
GRANT ALL ON public.reservas TO service_role;
GRANT ALL ON public.avaliacoes TO service_role;

CREATE TABLE public.limites_envio (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL CHECK (tipo IN ('reserva','avaliacao','exclusao')),
  ip_hash text NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.limites_envio TO service_role;
ALTER TABLE public.limites_envio ENABLE ROW LEVEL SECURITY;
CREATE INDEX limites_envio_busca ON public.limites_envio (tipo, ip_hash, criado_em DESC);

-- ===== LGPD =====
ALTER TABLE public.reservas ADD COLUMN "consentimentoEm" timestamptz;
ALTER TABLE public.reservas ADD COLUMN "consentimentoVersao" text NOT NULL DEFAULT '';
ALTER TABLE public.reservas ADD COLUMN "anonimizadaEm" timestamptz;

CREATE TABLE public.pedidos_exclusao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reserva_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'Pendente' CHECK (status IN ('Pendente','Concluído')),
  criado_em timestamptz NOT NULL DEFAULT now(),
  concluido_em timestamptz
);
GRANT SELECT, UPDATE, DELETE ON public.pedidos_exclusao TO authenticated;
GRANT ALL ON public.pedidos_exclusao TO service_role;
ALTER TABLE public.pedidos_exclusao ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin le pedidos" ON public.pedidos_exclusao FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin atualiza pedidos" ON public.pedidos_exclusao FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin exclui pedidos" ON public.pedidos_exclusao FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.anonimizar_reserva(_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'sem permissao'; END IF;
  UPDATE public.reservas SET "nomeCompleto"='Dados removidos', contato='Dados removidos', "anonimizadaEm"=now() WHERE id=_id;
  UPDATE public.pedidos_exclusao SET status='Concluído', concluido_em=now() WHERE reserva_id=_id AND status='Pendente';
  RETURN FOUND;
END $$;
REVOKE EXECUTE ON FUNCTION public.anonimizar_reserva(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.anonimizar_reserva(uuid) TO authenticated;

-- Retenção: reservas encerradas há mais de 6 meses perdem nome e contato
CREATE OR REPLACE FUNCTION public.anonimizar_reservas_antigas()
RETURNS integer LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  WITH a AS (
    UPDATE public.reservas SET "nomeCompleto"='Dados removidos', contato='Dados removidos', "anonimizadaEm"=now()
    WHERE "anonimizadaEm" IS NULL AND status IN ('Vendido','Cancelada') AND "createdAt" < now() - interval '6 months'
    RETURNING 1)
  SELECT count(*)::int FROM a
$$;
REVOKE EXECUTE ON FUNCTION public.anonimizar_reservas_antigas() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.anonimizar_reservas_antigas() TO service_role;

-- ===== Reserva trava a peça =====
CREATE OR REPLACE FUNCTION public.reserva_trava_peca()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE st text;
BEGIN
  SELECT status INTO st FROM public.produtos WHERE codigo = NEW."codigoProduto" FOR UPDATE;
  IF st IS NULL THEN RAISE EXCEPTION 'PECA_INEXISTENTE' USING ERRCODE='P0001'; END IF;
  IF st <> 'available' THEN RAISE EXCEPTION 'PECA_INDISPONIVEL' USING ERRCODE='P0001'; END IF;
  UPDATE public.produtos SET status='reserved' WHERE codigo = NEW."codigoProduto";
  RETURN NEW;
END $$;
CREATE TRIGGER reservas_trava_peca BEFORE INSERT ON public.reservas FOR EACH ROW EXECUTE FUNCTION public.reserva_trava_peca();

CREATE OR REPLACE FUNCTION public.reserva_sincroniza_peca()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'Cancelada' THEN
      UPDATE public.produtos SET status='available' WHERE codigo=NEW."codigoProduto" AND status='reserved';
    ELSIF NEW.status = 'Vendido' THEN
      UPDATE public.produtos SET status='exchanged' WHERE codigo=NEW."codigoProduto";
    ELSIF OLD.status = 'Cancelada' THEN
      UPDATE public.produtos SET status='reserved' WHERE codigo=NEW."codigoProduto" AND status='available';
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER reservas_sincroniza_peca AFTER UPDATE ON public.reservas FOR EACH ROW EXECUTE FUNCTION public.reserva_sincroniza_peca();

-- ===== Histórico / log de ações =====
CREATE TABLE public.historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tabela text NOT NULL,
  registro_id uuid,
  acao text NOT NULL,
  autor uuid,
  autor_email text NOT NULL DEFAULT '',
  antes jsonb,
  depois jsonb,
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.historico TO authenticated;
GRANT ALL ON public.historico TO service_role;
ALTER TABLE public.historico ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin le historico" ON public.historico FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE INDEX historico_data ON public.historico (criado_em DESC);

CREATE OR REPLACE FUNCTION public.registrar_historico()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); mail text := '';
BEGIN
  IF uid IS NOT NULL THEN SELECT coalesce(email,'') INTO mail FROM auth.users WHERE id = uid; END IF;
  INSERT INTO public.historico (tabela, registro_id, acao, autor, autor_email, antes, depois)
  VALUES (TG_TABLE_NAME,
          CASE WHEN TG_OP='DELETE' THEN OLD.id ELSE NEW.id END,
          TG_OP, uid, coalesce(mail, CASE WHEN uid IS NULL THEN 'site/sistema' ELSE '' END),
          CASE WHEN TG_OP='INSERT' THEN NULL ELSE to_jsonb(OLD) END,
          CASE WHEN TG_OP='DELETE' THEN NULL ELSE to_jsonb(NEW) END);
  RETURN NULL;
END $$;
CREATE TRIGGER produtos_historico AFTER INSERT OR UPDATE OR DELETE ON public.produtos FOR EACH ROW EXECUTE FUNCTION public.registrar_historico();
CREATE TRIGGER reservas_historico AFTER INSERT OR UPDATE OR DELETE ON public.reservas FOR EACH ROW EXECUTE FUNCTION public.registrar_historico();

-- ===== Vários administradores =====
CREATE TABLE public.admin_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  acao text NOT NULL CHECK (acao IN ('promoveu','removeu','convidou')),
  alvo_email text NOT NULL,
  autor uuid,
  autor_email text NOT NULL DEFAULT '',
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.admin_log TO authenticated;
GRANT ALL ON public.admin_log TO service_role;
ALTER TABLE public.admin_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin le admin_log" ON public.admin_log FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.listar_admins()
RETURNS TABLE(user_id uuid, email text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'sem permissao'; END IF;
  RETURN QUERY SELECT r.user_id, u.email::text FROM public.user_roles r JOIN auth.users u ON u.id = r.user_id WHERE r.role='admin' ORDER BY u.email;
END $$;
REVOKE EXECUTE ON FUNCTION public.listar_admins() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.listar_admins() TO authenticated;

CREATE OR REPLACE FUNCTION public.remover_admin(_user_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE total int; alvo text; eu text;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'sem permissao'; END IF;
  SELECT count(*) INTO total FROM public.user_roles WHERE role='admin';
  IF total <= 1 THEN RAISE EXCEPTION 'ULTIMO_ADMIN'; END IF;
  SELECT email INTO alvo FROM auth.users WHERE id=_user_id;
  SELECT email INTO eu FROM auth.users WHERE id=auth.uid();
  DELETE FROM public.user_roles WHERE user_id=_user_id AND role='admin';
  INSERT INTO public.admin_log (acao, alvo_email, autor, autor_email) VALUES ('removeu', coalesce(alvo,''), auth.uid(), coalesce(eu,''));
  RETURN true;
END $$;
REVOKE EXECUTE ON FUNCTION public.remover_admin(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.remover_admin(uuid) TO authenticated;

-- has_role / reivindicar_admin não precisam ser chamados por visitantes
REVOKE EXECUTE ON FUNCTION public.reivindicar_admin() FROM anon;
