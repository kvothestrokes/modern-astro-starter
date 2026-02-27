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
    if (error) {
      alert(`No se pudo actualizar estado: ${error.message}`);
      return;
    }
    window.location.reload();
  });
});
