import { createClient } from '@supabase/supabase-js';

const form = document.querySelector<HTMLFormElement>('#adminLoginForm');
const feedback = document.querySelector<HTMLParagraphElement>('#loginFeedback');

const supabase = createClient(
  import.meta.env.PUBLIC_SUPABASE_URL,
  import.meta.env.PUBLIC_SUPABASE_ANON_KEY
);

form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!feedback) return;
  feedback.textContent = 'Validando...';
  const email = (form.querySelector('[name="email"]') as HTMLInputElement).value;
  const password = (form.querySelector('[name="password"]') as HTMLInputElement).value;
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    feedback.textContent = error?.message ?? 'No fue posible iniciar sesion';
    return;
  }
  document.cookie = 'app_admin=1; path=/; max-age=86400; SameSite=Lax';
  window.location.href = '/admin/pedidos';
});
