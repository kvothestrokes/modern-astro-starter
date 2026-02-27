import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.PUBLIC_SUPABASE_URL,
  import.meta.env.PUBLIC_SUPABASE_ANON_KEY
);

document.querySelectorAll<HTMLSelectElement>('.statusSelect').forEach((select) => {
  select.addEventListener('change', async () => {
    const designId = select.dataset.designId;
    const status = select.value;
    const { error } = await supabase.from('designs').update({ status }).eq('id', designId);
    if (error) return alert(error.message);
    location.reload();
  });
});

document.querySelectorAll<HTMLButtonElement>('.noteBtn').forEach((button) => {
  button.addEventListener('click', async () => {
    const designId = button.dataset.noteId;
    const notes = window.prompt('Observacion interna:');
    if (!notes) return;
    const { error } = await supabase.from('designs').update({ notes }).eq('id', designId);
    if (error) return alert(error.message);
    location.reload();
  });
});
