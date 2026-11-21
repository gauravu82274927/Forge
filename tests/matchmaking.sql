BEGIN;
GRANT USAGE ON SCHEMA public, extensions TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated, service_role;
INSERT INTO auth.users(id,email) VALUES
('00000000-0000-0000-0000-000000000001','owner@test.invalid'),
('00000000-0000-0000-0000-000000000002','candidate@test.invalid'),
('00000000-0000-0000-0000-000000000003','member@test.invalid'),
('00000000-0000-0000-0000-000000000004','unknown@test.invalid');
UPDATE public.profiles SET skills=ARRAY['React'] WHERE id='00000000-0000-0000-0000-000000000001';
UPDATE public.profiles SET skills=ARRAY[' Python ','python'], bio='Python backend developer',
 experience_level='intermediate',availability='5-8 hrs/week' WHERE id='00000000-0000-0000-0000-000000000002';
UPDATE public.profiles SET skills=ARRAY['PyTorch'] WHERE id='00000000-0000-0000-0000-000000000003';
INSERT INTO public.team_posts(id,owner_id,title,summary,description,category,required_skills,open_positions,commitment,experience_level,status,deadline)
SELECT ('00000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid,'00000000-0000-0000-0000-000000000001',
 'Python team '||n,'Python backend','Python backend developer','AI / ML',ARRAY['React','Python','python','PyTorch'],
 CASE WHEN n=102 THEN 1 ELSE 2 END,'5-8 hrs/week','intermediate',CASE WHEN n=103 THEN 'closed' ELSE 'open' END,
 CASE WHEN n=104 THEN current_date-1 ELSE NULL END FROM generate_series(101,106) n;
INSERT INTO public.applications(team_post_id,applicant_id,intro_message,status) VALUES
('00000000-0000-0000-0000-000000000101','00000000-0000-0000-0000-000000000003','Member','accepted'),
('00000000-0000-0000-0000-000000000102','00000000-0000-0000-0000-000000000003','Member','accepted'),
('00000000-0000-0000-0000-000000000105','00000000-0000-0000-0000-000000000002','Pending','pending'),
('00000000-0000-0000-0000-000000000106','00000000-0000-0000-0000-000000000002','Withdrawn','withdrawn');

DO $$ DECLARE t public.team_posts; p public.profiles; s jsonb; BEGIN
 SELECT * INTO t FROM public.team_posts WHERE id='00000000-0000-0000-0000-000000000101';
 SELECT * INTO p FROM public.profiles WHERE id='00000000-0000-0000-0000-000000000002';
 ASSERT forge_match.gaps(t)=ARRAY['python'], 'Must subtract owner and accepted members and deduplicate skills';
 s:=forge_match.score(p,t,forge_match.gaps(t));
 ASSERT s->>'skills_score'='100', 'Skill normalization must be case insensitive';
 ASSERT s->>'method'='keyword', 'No embeddings must use keyword fallback';
 ASSERT s->>'experience_score'='100' AND s->>'commitment_score'='100', 'Exact compatibility';
 ASSERT (s->>'score')::int BETWEEN 0 AND 100, 'Bounded score';
 p.experience_level:=NULL; p.availability:=NULL;
 s:=forge_match.score(p,t,'{}');
 ASSERT s->>'skills_score'='50' AND s->>'experience_score'='50' AND s->>'commitment_score'='50', 'Missing fields neutral';
 p.availability:='flexible'; p.experience_level:='beginner';
 s:=forge_match.score(p,t,ARRAY['python']);
 ASSERT s->>'experience_score'='60' AND s->>'commitment_score'='100', 'Adjacent and flexible';
 p.experience_level:='advanced'; t.experience_level:='beginner'; p.availability:='2-4 hrs/week'; t.commitment:='15+ hrs/week';
 s:=forge_match.score(p,t,ARRAY['python']);
 ASSERT s->>'experience_score'='20' AND s->>'commitment_score'='20', 'Distant experience and hours';
 ASSERT NOT has_function_privilege('authenticated','public.claim_match_embedding(text,uuid)','EXECUTE'), 'Lease is server-only';
 ASSERT NOT has_function_privilege('anon','public.match_teams_for_user(uuid,integer)','EXECUTE'), 'Anonymous matches blocked';
END $$;

SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
SELECT set_config('request.jwt.claim.role','authenticated',true);
SET LOCAL ROLE authenticated;
DO $$ DECLARE n int; BEGIN
 SELECT count(*) INTO n FROM public.match_teams_for_user();
 ASSERT n=1,'Exclude closed, expired, full and already-applied teams';
 BEGIN
   PERFORM public.match_teams_for_user('00000000-0000-0000-0000-000000000001');
   RAISE EXCEPTION 'Cross-user matching was allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
   PERFORM public.match_users_for_team('00000000-0000-0000-0000-000000000101');
   RAISE EXCEPTION 'Non-owner matching was allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 UPDATE public.profiles SET embedding=('['||'1,'||repeat('0,',1534)||'0]')::extensions.vector
 WHERE id='00000000-0000-0000-0000-000000000002';
 ASSERT (SELECT embedding IS NULL FROM public.profiles WHERE id=auth.uid()),'Client cannot forge embedding';
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
SET LOCAL ROLE authenticated;
DO $$ DECLARE n int; BEGIN
 SELECT count(*) INTO n FROM public.match_users_for_team('00000000-0000-0000-0000-000000000101');
 ASSERT n=1,'Owner and accepted members excluded; incomplete candidates excluded';
 SELECT count(*) INTO n FROM public.match_users_for_team('00000000-0000-0000-0000-000000000102');
 ASSERT n=0,'Full teams have no recommendations';
END $$;
RESET ROLE;

SELECT set_config('request.jwt.claim.role','service_role',true);
DO $$ DECLARE n int; p public.profiles; t public.team_posts; s jsonb; BEGIN
 SELECT count(*) INTO n FROM public.claim_match_embedding('profile','00000000-0000-0000-0000-000000000002');
 ASSERT n=1,'First refresh obtains lease';
 SELECT count(*) INTO n FROM public.claim_match_embedding('profile','00000000-0000-0000-0000-000000000002');
 ASSERT n=0,'Concurrent refresh is throttled';
 UPDATE public.profiles SET embedding=('['||'1,'||repeat('0,',1534)||'0]')::extensions.vector WHERE id='00000000-0000-0000-0000-000000000002';
 UPDATE public.team_posts SET embedding=('['||'1,'||repeat('0,',1534)||'0]')::extensions.vector WHERE id='00000000-0000-0000-0000-000000000101';
 SELECT * INTO p FROM public.profiles WHERE id='00000000-0000-0000-0000-000000000002';
 SELECT * INTO t FROM public.team_posts WHERE id='00000000-0000-0000-0000-000000000101';
 s:=forge_match.score(p,t,forge_match.gaps(t));
 ASSERT s->>'method'='semantic' AND s->>'score'='100','Identical vectors and exact fit score 100';
 UPDATE public.profiles SET bio='Changed input' WHERE id=p.id;
 ASSERT (SELECT embedding IS NULL FROM public.profiles WHERE id=p.id),'Semantic edits invalidate old vectors';
 UPDATE public.profiles SET embedding=p.embedding WHERE id=p.id AND match_text=p.match_text;
 GET DIAGNOSTICS n=ROW_COUNT;
 ASSERT n=0,'Stale response cannot overwrite a newer profile';
END $$;
ROLLBACK;
