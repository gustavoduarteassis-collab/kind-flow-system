import { createClient } from '@supabase/supabase-client';
import * as XLSX from 'xlsx';
import fs from 'fs';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function sync() {
  const buf = fs.readFileSync('/tmp/STATOS_DE_TODAS_AS_LOJAS.xlsx');
  const workbook = XLSX.read(buf, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet);

  for (const row of data) {
    const nome = row['Local'] ? row['Local'].split('\r')[0] : 'Loja Sem Nome';
    const filial = String(row['Filial'] || '');
    
    const storeData = {
      nome: nome,
      filial: filial,
      localizacao: row['Local'],
      previsao_inauguracao_texto: String(row['Previsão inicial de inauguração'] || ''),
      inicio_obra_texto: row['Início da Obra'],
      status_geral: row['Status Geral'],
      comentarios_obras: row['Comentários'],
      // Map other fields to checklist or solicitacoes if needed, 
      // but for now we focus on the requested ones.
    };

    console.log(`Syncing store: ${nome} (${filial})`);

    // Check if store exists by filial or nome
    const { data: existing } = await supabase
      .from('stores')
      .select('id')
      .or(`filial.eq.${filial},nome.eq.${nome}`)
      .limit(1);

    if (existing && existing.length > 0) {
      await supabase.from('stores').update(storeData).eq('id', existing[0].id);
    } else {
      await supabase.from('stores').insert(storeData);
    }
  }
}

sync().catch(console.error);
