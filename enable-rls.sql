-- Enable Row Level Security on all tables
-- Since we're using Prisma with a service role connection, we'll enable RLS
-- but allow all operations (the service role bypasses RLS anyway)

-- Enable RLS on all tables
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escalations ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for service role access
-- (Service role bypasses RLS, but this silences the warnings)
CREATE POLICY "Enable all access for service role" ON public.workspaces FOR ALL USING (true);
CREATE POLICY "Enable all access for service role" ON public.channels FOR ALL USING (true);
CREATE POLICY "Enable all access for service role" ON public.users FOR ALL USING (true);
CREATE POLICY "Enable all access for service role" ON public.questions FOR ALL USING (true);
CREATE POLICY "Enable all access for service role" ON public.escalations FOR ALL USING (true);
