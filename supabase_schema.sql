--
-- PostgreSQL database dump
--

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: match_sources_chunks(public.vector, integer, uuid[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.match_sources_chunks(query_embedding public.vector, match_count integer DEFAULT 5, filter_source_ids uuid[] DEFAULT NULL::uuid[]) RETURNS TABLE(id uuid, source_id uuid, chunk_text text, chunk_index integer, similarity double precision)
    LANGUAGE sql
    AS $$
    SELECT
        sc.id,
        sc.source_id,
        sc.chunk_text,
        sc.chunk_index,
        1 - (sc.embedding <=> query_embedding) AS similarity
    FROM public.source_chunks sc
    WHERE
        sc.embedding IS NOT NULL
        AND (filter_source_ids IS NULL OR sc.source_id = ANY(filter_source_ids))
    ORDER BY sc.embedding <=> query_embedding
    LIMIT match_count;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: conversation_sources; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.conversation_sources (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    conversation_id uuid NOT NULL,
    source_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: conversations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.conversations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    conversation_id uuid,
    role text,
    content text NOT NULL,
    sources jsonb,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT messages_role_check CHECK ((role = ANY (ARRAY['user'::text, 'assistant'::text, 'system'::text])))
);


--
-- Name: quiz_attempts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quiz_attempts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    quiz_id uuid,
    answers jsonb NOT NULL,
    score numeric,
    status text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT quiz_attempts_status_check CHECK ((status = ANY (ARRAY['in_progress'::text, 'completed'::text])))
);


--
-- Name: quizzes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quizzes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    questions jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    conversation_id uuid
);


--
-- Name: source_chunks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.source_chunks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    source_id uuid NOT NULL,
    chunk_text text NOT NULL,
    chunk_index integer NOT NULL,
    embedding public.vector(1536),
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: source_summaries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.source_summaries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    source_id uuid,
    summary text NOT NULL,
    key_points jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: sources; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sources (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    filename character varying(255) NOT NULL,
    original_name character varying(255) NOT NULL,
    file_type character varying(10) NOT NULL,
    file_size bigint NOT NULL,
    file_path text NOT NULL,
    extracted_text text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    source_url text,
    CONSTRAINT sources_file_type_check CHECK (((file_type)::text = ANY ((ARRAY['pdf'::character varying, 'docx'::character varying, 'doc'::character varying, 'txt'::character varying, 'url'::character varying])::text[])))
);


--
-- Name: conversation_sources conversation_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversation_sources
    ADD CONSTRAINT conversation_documents_pkey PRIMARY KEY (id);


--
-- Name: conversation_sources conversation_sources_conversation_id_source_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversation_sources
    ADD CONSTRAINT conversation_sources_conversation_id_source_id_key UNIQUE (conversation_id, source_id);


--
-- Name: conversations conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_pkey PRIMARY KEY (id);


--
-- Name: source_chunks document_chunks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.source_chunks
    ADD CONSTRAINT document_chunks_pkey PRIMARY KEY (id);


--
-- Name: source_summaries document_summaries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.source_summaries
    ADD CONSTRAINT document_summaries_pkey PRIMARY KEY (id);


--
-- Name: sources documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sources
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: quiz_attempts quiz_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quiz_attempts
    ADD CONSTRAINT quiz_attempts_pkey PRIMARY KEY (id);


--
-- Name: quizzes quizzes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quizzes
    ADD CONSTRAINT quizzes_pkey PRIMARY KEY (id);


--
-- Name: source_chunks source_chunks_source_id_chunk_index_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.source_chunks
    ADD CONSTRAINT source_chunks_source_id_chunk_index_key UNIQUE (source_id, chunk_index);


--
-- Name: source_summaries source_summaries_source_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.source_summaries
    ADD CONSTRAINT source_summaries_source_id_key UNIQUE (source_id);


--
-- Name: idx_conversation_sources_conversation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conversation_sources_conversation ON public.conversation_sources USING btree (conversation_id);


--
-- Name: idx_conversation_sources_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conversation_sources_source ON public.conversation_sources USING btree (source_id);


--
-- Name: idx_conversations_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conversations_created_at ON public.conversations USING btree (created_at DESC);


--
-- Name: idx_messages_conversation_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_conversation_id ON public.messages USING btree (conversation_id);


--
-- Name: idx_messages_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_created_at ON public.messages USING btree (created_at DESC);


--
-- Name: idx_quiz_attempts_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quiz_attempts_created_at ON public.quiz_attempts USING btree (created_at DESC);


--
-- Name: idx_quiz_attempts_quiz_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quiz_attempts_quiz_id ON public.quiz_attempts USING btree (quiz_id);


--
-- Name: idx_quiz_attempts_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quiz_attempts_status ON public.quiz_attempts USING btree (status);


--
-- Name: idx_quizzes_conversation_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quizzes_conversation_id ON public.quizzes USING btree (conversation_id);


--
-- Name: idx_quizzes_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quizzes_created_at ON public.quizzes USING btree (created_at DESC);


--
-- Name: idx_source_chunks_source_chunk; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_source_chunks_source_chunk ON public.source_chunks USING btree (source_id, chunk_index);


--
-- Name: idx_source_chunks_source_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_source_chunks_source_id ON public.source_chunks USING btree (source_id);


--
-- Name: idx_source_summaries_source_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_source_summaries_source_id ON public.source_summaries USING btree (source_id);


--
-- Name: idx_sources_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sources_created_at ON public.sources USING btree (created_at DESC);


--
-- Name: idx_sources_file_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sources_file_type ON public.sources USING btree (file_type);


--
-- Name: conversations update_conversations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON public.conversations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: sources update_sources_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_sources_updated_at BEFORE UPDATE ON public.sources FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: conversation_sources conversation_documents_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversation_sources
    ADD CONSTRAINT conversation_documents_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;


--
-- Name: conversation_sources conversation_sources_source_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversation_sources
    ADD CONSTRAINT conversation_sources_source_id_fkey FOREIGN KEY (source_id) REFERENCES public.sources(id) ON DELETE CASCADE;


--
-- Name: messages messages_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;


--
-- Name: quiz_attempts quiz_attempts_quiz_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quiz_attempts
    ADD CONSTRAINT quiz_attempts_quiz_id_fkey FOREIGN KEY (quiz_id) REFERENCES public.quizzes(id) ON DELETE CASCADE;


--
-- Name: quizzes quizzes_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quizzes
    ADD CONSTRAINT quizzes_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;


--
-- Name: source_chunks source_chunks_source_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.source_chunks
    ADD CONSTRAINT source_chunks_source_id_fkey FOREIGN KEY (source_id) REFERENCES public.sources(id) ON DELETE CASCADE;


--
-- Name: source_summaries source_summaries_source_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.source_summaries
    ADD CONSTRAINT source_summaries_source_id_fkey FOREIGN KEY (source_id) REFERENCES public.sources(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

