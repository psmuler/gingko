

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


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."reset_haikus_sequence"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- シーケンスを1にリセット
    PERFORM setval(pg_get_serial_sequence('haikus', 'id'), 1, false);
END;
$$;


ALTER FUNCTION "public"."reset_haikus_sequence"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reset_poets_sequence"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- シーケンスを1にリセット
    PERFORM setval(pg_get_serial_sequence('poets', 'id'), 1, false);
END;
$$;


ALTER FUNCTION "public"."reset_poets_sequence"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."haikus" (
    "id" integer NOT NULL,
    "haiku_text" "text" NOT NULL,
    "poet_id" integer,
    "latitude" numeric(10,8),
    "longitude" numeric(11,8),
    "location_type" character varying(20),
    "date_composed" "date",
    "location_name" character varying(200),
    "date_composed_era" character varying(50),
    "description" "text",
    "season" character varying(10),
    "seasonal_term" character varying(50),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "poetry_type" "text" DEFAULT '俳句'::"text",
    "keyword_id" integer,
    "status" character varying(20) DEFAULT 'published'::character varying NOT NULL,
    CONSTRAINT "chk_haikus_status" CHECK ((("status")::"text" = ANY ((ARRAY['draft'::character varying, 'published'::character varying])::"text"[]))),
    CONSTRAINT "haikus_location_type_check" CHECK ((("location_type")::"text" = ANY (ARRAY[('句碑'::character varying)::"text", ('紀行文'::character varying)::"text", ('ゆかりの地'::character varying)::"text", ('歌枕'::character varying)::"text"])))
);


ALTER TABLE "public"."haikus" OWNER TO "postgres";


COMMENT ON COLUMN "public"."haikus"."poetry_type" IS '俳句、短歌、脇句など';



COMMENT ON COLUMN "public"."haikus"."keyword_id" IS '季語ID（keywordsテーブルのidを参照）';



COMMENT ON COLUMN "public"."haikus"."status" IS '俳句のステータス（draft: 下書き, published: 投稿済み）';



CREATE SEQUENCE IF NOT EXISTS "public"."haikus_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."haikus_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."haikus_id_seq" OWNED BY "public"."haikus"."id";



CREATE TABLE IF NOT EXISTS "public"."keywords" (
    "id" integer NOT NULL,
    "display_name" character varying(100) NOT NULL,
    "display_name_alternatives" "text"[],
    "type" character varying(20) NOT NULL,
    "season" character varying(20),
    "description" "text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."keywords" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."keywords_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."keywords_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."keywords_id_seq" OWNED BY "public"."keywords"."id";



CREATE TABLE IF NOT EXISTS "public"."poets" (
    "id" integer NOT NULL,
    "name" character varying(100) NOT NULL,
    "name_kana" character varying(200),
    "birth_year" integer,
    "death_year" integer,
    "period" character varying(50),
    "biography" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."poets" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."poets_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."poets_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."poets_id_seq" OWNED BY "public"."poets"."id";



ALTER TABLE ONLY "public"."haikus" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."haikus_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."keywords" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."keywords_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."poets" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."poets_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."haikus"
    ADD CONSTRAINT "haikus_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."keywords"
    ADD CONSTRAINT "keywords_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."poets"
    ADD CONSTRAINT "poets_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_haikus_keyword_id" ON "public"."haikus" USING "btree" ("keyword_id");



CREATE INDEX "idx_haikus_location" ON "public"."haikus" USING "gist" ("point"(("longitude")::double precision, ("latitude")::double precision));



CREATE INDEX "idx_haikus_location_type" ON "public"."haikus" USING "btree" ("location_type");



CREATE INDEX "idx_haikus_poet_id" ON "public"."haikus" USING "btree" ("poet_id");



CREATE INDEX "idx_haikus_season" ON "public"."haikus" USING "btree" ("season");



CREATE INDEX "idx_haikus_seasonal_term" ON "public"."haikus" USING "btree" ("seasonal_term");



CREATE INDEX "idx_haikus_status" ON "public"."haikus" USING "btree" ("status");



CREATE INDEX "idx_haikus_status_created_at" ON "public"."haikus" USING "btree" ("status", "created_at" DESC);



CREATE INDEX "idx_haikus_text_search" ON "public"."haikus" USING "gin" ("to_tsvector"('"simple"'::"regconfig", "haiku_text"));



CREATE INDEX "idx_keywords_display_name" ON "public"."keywords" USING "btree" ("display_name");



CREATE INDEX "idx_keywords_kigo" ON "public"."keywords" USING "btree" ("type", "season") WHERE (("type")::"text" = '季語'::"text");



CREATE INDEX "idx_keywords_season" ON "public"."keywords" USING "btree" ("season");



CREATE INDEX "idx_keywords_type" ON "public"."keywords" USING "btree" ("type");



CREATE INDEX "idx_poets_name_search" ON "public"."poets" USING "gin" ("to_tsvector"('"simple"'::"regconfig", ("name")::"text"));



CREATE OR REPLACE TRIGGER "update_haikus_updated_at" BEFORE UPDATE ON "public"."haikus" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_poets_updated_at" BEFORE UPDATE ON "public"."poets" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."haikus"
    ADD CONSTRAINT "haikus_keyword_id_fkey" FOREIGN KEY ("keyword_id") REFERENCES "public"."keywords"("id") ON UPDATE CASCADE;



ALTER TABLE ONLY "public"."haikus"
    ADD CONSTRAINT "haikus_poet_id_fkey" FOREIGN KEY ("poet_id") REFERENCES "public"."poets"("id");



CREATE POLICY "Allow anonymous read access on keywords" ON "public"."keywords" FOR SELECT TO "anon" USING (true);



CREATE POLICY "Enable all access for haikus" ON "public"."haikus" USING (true);



CREATE POLICY "Enable all access for poets" ON "public"."poets" USING (true);



ALTER TABLE "public"."haikus" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."keywords" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."poets" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."reset_haikus_sequence"() TO "anon";
GRANT ALL ON FUNCTION "public"."reset_haikus_sequence"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."reset_haikus_sequence"() TO "service_role";



GRANT ALL ON FUNCTION "public"."reset_poets_sequence"() TO "anon";
GRANT ALL ON FUNCTION "public"."reset_poets_sequence"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."reset_poets_sequence"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON TABLE "public"."haikus" TO "anon";
GRANT ALL ON TABLE "public"."haikus" TO "authenticated";
GRANT ALL ON TABLE "public"."haikus" TO "service_role";



GRANT ALL ON SEQUENCE "public"."haikus_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."haikus_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."haikus_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."keywords" TO "anon";
GRANT ALL ON TABLE "public"."keywords" TO "authenticated";
GRANT ALL ON TABLE "public"."keywords" TO "service_role";



GRANT ALL ON SEQUENCE "public"."keywords_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."keywords_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."keywords_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."poets" TO "anon";
GRANT ALL ON TABLE "public"."poets" TO "authenticated";
GRANT ALL ON TABLE "public"."poets" TO "service_role";



GRANT ALL ON SEQUENCE "public"."poets_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."poets_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."poets_id_seq" TO "service_role";



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






RESET ALL;
