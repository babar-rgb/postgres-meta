CREATE TABLE IF NOT EXISTS public.users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'user',
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id INTEGER REFERENCES public.users(id),
  amount DECIMAL(10,2),
  status TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO public.users (name, email, role, status) VALUES 
('Alice Admin', 'alice@nexus.io', 'admin', 'active'),
('Bob Builder', 'bob@nexus.io', 'user', 'active'),
('Charlie Chap', 'charlie@nexus.io', 'user', 'inactive'),
('Dave Dev', 'dave@nexus.io', 'developer', 'active')
ON CONFLICT (email) DO NOTHING;

INSERT INTO public.orders (user_id, amount, status) 
SELECT id, 150.00, 'completed' FROM public.users WHERE email = 'alice@nexus.io'
UNION ALL
SELECT id, 49.99, 'pending' FROM public.users WHERE email = 'bob@nexus.io';
