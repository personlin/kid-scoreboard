


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";





SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."point_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "kid_id" "uuid" NOT NULL,
    "delta" integer NOT NULL,
    "reason" "text",
    "kind" "text" DEFAULT 'manual'::"text" NOT NULL,
    "task_id" "uuid",
    "redemption_id" "uuid",
    "event_date" "date",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "point_events_kind_check" CHECK (("kind" = ANY (ARRAY['manual'::"text", 'task'::"text", 'redeem'::"text", 'adjust'::"text"])))
);


ALTER TABLE "public"."point_events" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_manual_points"("p_kid" "uuid", "p_delta" integer, "p_reason" "text" DEFAULT NULL::"text") RETURNS "public"."point_events"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  cur_bal int;
  applied int;
  ev public.point_events;
begin
  if p_delta = 0 then
    raise exception 'delta_cannot_be_zero';
  end if;

  cur_bal := public.get_kid_balance(p_kid);

  if p_delta < 0 then
    applied := greatest(p_delta, -cur_bal); -- cap so balance never below 0
  else
    applied := p_delta;
  end if;

  insert into public.point_events(kid_id, delta, reason, kind)
  values (p_kid, applied, p_reason, 'manual')
  returning * into ev;

  return ev;
end;
$$;


ALTER FUNCTION "public"."add_manual_points"("p_kid" "uuid", "p_delta" integer, "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."claim_task"("p_kid" "uuid", "p_task" "uuid", "p_event_date" "date", "p_reason" "text" DEFAULT NULL::"text") RETURNS "public"."point_events"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  pts int;
  ev public.point_events;
begin
  select t.points into pts from public.tasks t where t.id=p_task and t.active=true;
  if pts is null then
    raise exception 'task_not_found_or_inactive';
  end if;

  insert into public.point_events(kid_id, delta, reason, kind, task_id, event_date)
  values (p_kid, pts, coalesce(p_reason, 'task'), 'task', p_task, p_event_date)
  returning * into ev;

  return ev;
exception
  when unique_violation then
    raise exception 'task_already_claimed_for_day';
end;
$$;


ALTER FUNCTION "public"."claim_task"("p_kid" "uuid", "p_task" "uuid", "p_event_date" "date", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_kid_balance"("p_kid" "uuid") RETURNS integer
    LANGUAGE "sql" STABLE
    AS $$
  select coalesce(sum(delta), 0)::int from public.point_events where kid_id = p_kid;
$$;


ALTER FUNCTION "public"."get_kid_balance"("p_kid" "uuid") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."redemptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "kid_id" "uuid" NOT NULL,
    "reward_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "redeemed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "done_at" timestamp with time zone,
    "note" "text",
    CONSTRAINT "redemptions_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'done'::"text", 'canceled'::"text"])))
);


ALTER TABLE "public"."redemptions" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."redeem_reward"("p_kid" "uuid", "p_reward" "uuid", "p_note" "text" DEFAULT NULL::"text") RETURNS "public"."redemptions"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  cost int;
  cur_bal int;
  red public.redemptions;
  ev public.point_events;
begin
  select r.cost_points into cost from public.rewards r where r.id=p_reward and r.active=true;
  if cost is null then
    raise exception 'reward_not_found_or_inactive';
  end if;

  cur_bal := public.get_kid_balance(p_kid);
  if cur_bal < cost then
    raise exception 'insufficient_points';
  end if;

  insert into public.redemptions(kid_id, reward_id, status, note)
  values (p_kid, p_reward, 'pending', p_note)
  returning * into red;

  insert into public.point_events(kid_id, delta, reason, kind, redemption_id)
  values (p_kid, -cost, 'redeem', 'redeem', red.id)
  returning * into ev;

  return red;
end;
$$;


ALTER FUNCTION "public"."redeem_reward"("p_kid" "uuid", "p_reward" "uuid", "p_note" "text") OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."kid_balances" AS
SELECT
    NULL::"uuid" AS "kid_id",
    NULL::"text" AS "name",
    NULL::integer AS "sort_order",
    NULL::bigint AS "balance",
    NULL::timestamp with time zone AS "last_event_at";


ALTER VIEW "public"."kid_balances" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."kids" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "note" "text",
    "avatar_url" "text",
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."kids" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rewards" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "cost_points" integer NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "rewards_cost_points_check" CHECK (("cost_points" > 0))
);


ALTER TABLE "public"."rewards" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tasks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "points" integer NOT NULL,
    "is_daily" boolean DEFAULT true NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "tasks_points_check" CHECK (("points" > 0))
);


ALTER TABLE "public"."tasks" OWNER TO "postgres";


ALTER TABLE ONLY "public"."kids"
    ADD CONSTRAINT "kids_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."point_events"
    ADD CONSTRAINT "point_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."redemptions"
    ADD CONSTRAINT "redemptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rewards"
    ADD CONSTRAINT "rewards_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_pkey" PRIMARY KEY ("id");



CREATE INDEX "point_events_kid_created_idx" ON "public"."point_events" USING "btree" ("kid_id", "created_at" DESC);



CREATE INDEX "point_events_task_date_idx" ON "public"."point_events" USING "btree" ("task_id", "event_date");



CREATE INDEX "redemptions_kid_status_idx" ON "public"."redemptions" USING "btree" ("kid_id", "status", "redeemed_at" DESC);



CREATE UNIQUE INDEX "uniq_task_claim_per_day" ON "public"."point_events" USING "btree" ("kid_id", "task_id", "event_date") WHERE (("kind" = 'task'::"text") AND ("task_id" IS NOT NULL) AND ("event_date" IS NOT NULL));



CREATE OR REPLACE VIEW "public"."kid_balances" AS
 SELECT "k"."id" AS "kid_id",
    "k"."name",
    "k"."sort_order",
    COALESCE("sum"("pe"."delta"), (0)::bigint) AS "balance",
    "max"("pe"."created_at") AS "last_event_at"
   FROM ("public"."kids" "k"
     LEFT JOIN "public"."point_events" "pe" ON (("pe"."kid_id" = "k"."id")))
  GROUP BY "k"."id";



ALTER TABLE ONLY "public"."point_events"
    ADD CONSTRAINT "point_events_kid_id_fkey" FOREIGN KEY ("kid_id") REFERENCES "public"."kids"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."point_events"
    ADD CONSTRAINT "point_events_redemption_id_fkey" FOREIGN KEY ("redemption_id") REFERENCES "public"."redemptions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."point_events"
    ADD CONSTRAINT "point_events_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."redemptions"
    ADD CONSTRAINT "redemptions_kid_id_fkey" FOREIGN KEY ("kid_id") REFERENCES "public"."kids"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."redemptions"
    ADD CONSTRAINT "redemptions_reward_id_fkey" FOREIGN KEY ("reward_id") REFERENCES "public"."rewards"("id") ON DELETE RESTRICT;



ALTER TABLE "public"."kids" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "kids_select_auth" ON "public"."kids" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "kids_write_auth" ON "public"."kids" TO "authenticated" USING (true) WITH CHECK (true);



ALTER TABLE "public"."point_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "point_events_select_auth" ON "public"."point_events" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "point_events_write_auth" ON "public"."point_events" TO "authenticated" USING (true) WITH CHECK (true);



ALTER TABLE "public"."redemptions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "redemptions_select_auth" ON "public"."redemptions" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "redemptions_write_auth" ON "public"."redemptions" TO "authenticated" USING (true) WITH CHECK (true);



ALTER TABLE "public"."rewards" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "rewards_select_auth" ON "public"."rewards" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "rewards_write_auth" ON "public"."rewards" TO "authenticated" USING (true) WITH CHECK (true);



ALTER TABLE "public"."tasks" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tasks_select_auth" ON "public"."tasks" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "tasks_write_auth" ON "public"."tasks" TO "authenticated" USING (true) WITH CHECK (true);





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON TABLE "public"."point_events" TO "anon";
GRANT ALL ON TABLE "public"."point_events" TO "authenticated";
GRANT ALL ON TABLE "public"."point_events" TO "service_role";



GRANT ALL ON FUNCTION "public"."add_manual_points"("p_kid" "uuid", "p_delta" integer, "p_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."add_manual_points"("p_kid" "uuid", "p_delta" integer, "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_manual_points"("p_kid" "uuid", "p_delta" integer, "p_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."claim_task"("p_kid" "uuid", "p_task" "uuid", "p_event_date" "date", "p_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."claim_task"("p_kid" "uuid", "p_task" "uuid", "p_event_date" "date", "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."claim_task"("p_kid" "uuid", "p_task" "uuid", "p_event_date" "date", "p_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_kid_balance"("p_kid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_kid_balance"("p_kid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_kid_balance"("p_kid" "uuid") TO "service_role";



GRANT ALL ON TABLE "public"."redemptions" TO "anon";
GRANT ALL ON TABLE "public"."redemptions" TO "authenticated";
GRANT ALL ON TABLE "public"."redemptions" TO "service_role";



GRANT ALL ON FUNCTION "public"."redeem_reward"("p_kid" "uuid", "p_reward" "uuid", "p_note" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."redeem_reward"("p_kid" "uuid", "p_reward" "uuid", "p_note" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."redeem_reward"("p_kid" "uuid", "p_reward" "uuid", "p_note" "text") TO "service_role";


















GRANT ALL ON TABLE "public"."kid_balances" TO "anon";
GRANT ALL ON TABLE "public"."kid_balances" TO "authenticated";
GRANT ALL ON TABLE "public"."kid_balances" TO "service_role";



GRANT ALL ON TABLE "public"."kids" TO "anon";
GRANT ALL ON TABLE "public"."kids" TO "authenticated";
GRANT ALL ON TABLE "public"."kids" TO "service_role";



GRANT ALL ON TABLE "public"."rewards" TO "anon";
GRANT ALL ON TABLE "public"."rewards" TO "authenticated";
GRANT ALL ON TABLE "public"."rewards" TO "service_role";



GRANT ALL ON TABLE "public"."tasks" TO "anon";
GRANT ALL ON TABLE "public"."tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."tasks" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































